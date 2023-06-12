const models = require('../../models');
const { GridManager } = require('./grid');
const { exchangeInstanceWithMarkets } = require('../services/ExchangeMarket');
const { InstanceRepository } = require('../../repository/InstanceRepository');
const { StrategyInstanceEventRepository, LEVEL_INFO } = require('../../repository/StrategyInstanceEventRepository');
const OrderSenderEventService = require('../services/OrderSenderEventService');
/** @typedef {import('bull').Queue} Queue} */

/**
 * Callback for adding two numbers.
 *
 * @callback CancelCallback
 * @returns {boolean}
 */

let instanceRepository = new InstanceRepository();
let eventRepository = new StrategyInstanceEventRepository();
/**
 * 
 * @param {CancelCallback} isCancelled 
 * @returns 
 */
exports.startGrids = async function(isCancelled) {
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
                    console.error("StartGrids: could not get current price from exchange")
                    return;
                }

                let gridCreator = new GridManager(exchange, instance, strategy)
                let entries = gridCreator.createGridEntries(currentPrice);
                await models.sequelize.transaction(async (transaction) => {
                    for (let i=0;i<entries.length;i++) {
                        await models.StrategyInstanceGrid.create(
                            entries[i],{
                                transaction
                            });
                    }

                });

                await eventRepository.create(
                    instance,
                    'GridStart',
                    LEVEL_INFO,
                    'Grid started',
                    await getPositionAndPrice(exchange, strategy.symbol, account.account_type.account_type)
                );

                // send message to next order (maybe we could check if any is pending)
                OrderSenderEventService.send(instance.id);
            } catch (ex) {
                console.error("StartGrids:", ex);
            }
        }
    } catch (ex){
        console.error("StartGrids:", ex);
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
                // stop grid in db
                await eventRepository.create(
                    instance,
                    'GridStop',
                    LEVEL_INFO,
                    'Grid stopped',
                    await getPositionAndPrice(exchange, strategy.symbol, account.account_type.account_type)
                );

                // TODO: cancel orders?
            } catch (ex) {
                console.error("StopGrids:", ex);
            }
        }
    } catch (ex) {
        console.error("StopGrids:", ex);
    }
}

async function getPositionAndPrice(exchange, symbol, accountType) {
    let position;
    let price;
    try {
        position = await getPosition(exchange, symbol, accountType);
        price = await exchange.fetchCurrentPrice(symbol);
    } catch (ex) {
        console.error(ex);
    }
    return {position, price};
}

async function getPosition(exchange, symbol, accountType) {
    let position = null;
    if (accountType == 'spot') {
        console.log('Fetching balance...');
        let balance = await exchange.fetchBalance();
        let market = exchange.market(symbol);
        if (market != null) {
            position = balance.total[market.base];
        }
    } else {
        console.log('Fetching positions...');
        let positions = await exchange.fetchPositions(symbol);
        if (positions.length > 0) {
            position = positions[0].contracts;
        }
    }

    return position;
}