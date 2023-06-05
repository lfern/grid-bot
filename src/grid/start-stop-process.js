const models = require('../../models');
const { GridManager } = require('./grid');
const { exchangeInstanceWithMarkets } = require('../services/ExchangeMarket');
const Redlock = require("redlock");
const { InstanceRepository } = require('../../repository/InstanceRepository');
/** @typedef {import('bull').Queue} Queue} */

/**
 * Callback for adding two numbers.
 *
 * @callback CancelCallback
 * @returns {boolean}
 */

let instanceRepository = new InstanceRepository();
/**
 * 
 * @param {Redlock} redlock 
 * @param {CancelCallback} isCancelled 
 * @param {Queue} myOrderSenderQueue
 * @returns 
 */
exports.startGrids = async function(redlock, myOrderSenderQueue, isCancelled) {
    if (isCancelled()) return;

    try {

        let instance = null;
        while(!isCancelled()) {
            instance = null;
            await models.sequelize.transaction(async (transaction) => {
                instance = await models.StrategyInstance.findOne({
                    where: {
                        running: true,
                        started_at: { [models.Sequelize.Op.is]: null },
                        stop_requested_at: { [models.Sequelize.Op.is]: null }
                    },
                    order: [
                        ['updatedAt', 'ASC'],
                    ],
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                    limit: 1
                });

                if (instance != null) {
                    instance.started_at = models.Sequelize.fn('NOW');
                    instance.save();
                }
            });

            if (instance == null) {
                break;
            }

            try {
                instance = await instanceRepository.getInstance(instance.id);

                if (instance == null) {
                    return;
                }
                
                let strategy = instance.strategy;
                let account = strategy.account;

                // create exchange
                const exchange = await exchangeInstanceWithMarkets(account.exchange.exchange_name, {
                    exchangeType: account.account_type.account_type,
                    paper: account.paper,
                    rateLimit: 1000,  // testing 1 second though it is not recommended (I think we should not send too many requests/second)
                    apiKey: account.api_key,
                    secret: account.api_secret,
                });

                // Create grid in db
                let currentPrice = await exchange.fetchCurrentPrice(strategy.symbol);
                if (currentPrice == null) {
                    console.error("Could not get current price from exchange")
                    return;
                }

                let gridCreator = new GridManager(exchange, instance.id, strategy)
                let entries = gridCreator.createGridEntries(currentPrice);
                await models.sequelize.transaction(async (transaction) => {
                    for (let i=0;i<entries.length;i++) {
                        await models.StrategyInstanceGrid.create(
                            entries[i],{
                                transaction
                            });
                    }

                });

                // send message to next order (maybe we could check if any is pending)
                const options = {
                    attempts: 0,
                    removeOnComplete: true,
                    removeOnFail: true,
                };

                myOrderSenderQueue.add(instance.id, options).then(ret => {
                    console.log("Redis added:", ret);
                }). catch(err => {
                    console.error("Error:", err);
                });
            } catch (ex) {
                console.error("Error:", ex);
            }
        }
    } catch (ex){
        console.error("Error:", ex);
    }
}

exports.stopGrids = async function(isCancelled) {
    if (isCancelled()) return;

    try {
        const instances = await models.StrategyInstance.findAll({
            where: {
                stopped_at: { [models.Sequelize.Op.is]: null },
                stop_requested_at: { [models.Sequelize.Op.not]: null }
            },
            include: [
                {
                    association: models.StrategyInstance.Strategy,
                    include: [
                        {
                            association: models.Strategy.Account,
                            include: [
                                models.Account.Exchange,
                                models.Account.AccountType
                            ]
                        }
                    ]
                }
            ]
        });

        for (let i=0; i<instances.length && !isCancelled(); i++) {
            let instance = instances[i];
            let strategy = instance.strategy;
            let account = strategy.account;

            await models.StrategyInstance.update({
                running: false,
                stopped_at: models.Sequelize.fn('NOW')
            }, {
                where: {id: instance.id}
            });

            // create exchange
            const exchange = await exchangeInstanceWithMarkets(account.exchange.exchange_name, {
                exchangeType: account.account_type.account_type,
                paper: account.paper,
                rateLimit: 1000,  // testing 1 second though it is not recommended (I think we should not send too many requests/second)
                apiKey: account.api_key,
                secret: account.api_secret,
            });
            try {
                let position = await getPosition(exchange, strategy.symbol, account.account_type.account_type);
                let currentPrice = await exchange.fetchCurrentPrice(strategy.symbol);
                // stop grid in db
                models.StrategyInstanceEvent.create({
                    strategy_instance_id: instance.id,
                    event: 'GridStop',
                    message: 'Grid stopped',
                    params: {
                        price: currentPrice,
                        position: position,
                    },
                    price: currentPrice,
                    position: position,
                });
                // TODO: cancel orders?
            } catch (ex) {
                console.error("Error:", ex);
            }
        }
    } catch (ex) {
        console.error("Error:", ex);
    }
}

async function getPosition(exchange, symbol, accountType) {
    let position = null;
    if (accountType == 'spot') {
        console.log('Fetching balance...');
        let balance = await exchange.fetchBalance();
        console.log("Balance:", balance);
        let market = exchange.market(symbol);
        console.log("Market: ", market);
        if (market != null) {
            position = balance.total[market.base];
        }
    } else {
        console.log('Fetching positions...');
        let positions = await exchange.fetchPositions(symbol);
        console.log("Positions:", positions);
        if (positions.length > 0) {
            position = positions[0].contracts;
        }
    }

    return position;
}