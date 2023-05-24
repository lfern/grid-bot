const { cancelablePromise } = require('./src/crypto/exchanges/utils/procutils');
const Queue = require("bull");
require('dotenv').config();
//const {DbHelper} = require('./src/db/DbHelper');
const {sleep} = require('./src/crypto/exchanges/utils/timeutils');
const models = require('./models');
const { exchangeInstanceWithMarkets } = require('./src/services/ExchangeMarket');
const _ = require('lodash');
const BigNumber = require('bignumber.js');
const { GridManager } = require('./src/grid/grid');
const { BaseExchangeCcxtTrade } = require('./src/crypto/exchanges/ccxt/BaseExchangeCcxtTrade');
const { BaseExchangeCcxtOrder } = require('./src/crypto/exchanges/ccxt/BaseExchangeCcxtOrder');

/** @typedef {import('./src/grid/exchange-events').TradeDataEvent} TradeDataEvent */
/** @typedef {import('./src/grid/exchange-events').OrderDataEvent} OrderDataEvent */
/** @typedef {import('./src/grid/exchange-events').BalanceDataEvent} BalanceDataEvent */

const myTradesQueue = new Queue("myTrades", {
    // Redis configuration
    redis: {
        host: process.env.REDIS_SERVER || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
    },
});

const myOrdersQueue = new Queue("myOrders", {
    // Redis configuration
    redis: {
        host: process.env.REDIS_SERVER || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
    },
});

const myBalanceQueue = new Queue("myBalance", {
    // Redis configuration
    redis: {
        host: process.env.REDIS_SERVER || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
    },
});

// wait for trades from redis server
myTradesQueue.process(async (job, done) => {
    /** @type {TradeDataEvent} */
    let data = job.data;
    let dataTrade = BaseExchangeCcxtTrade.fromJson(data.trade);
    console.log(data);
    try {
        await models.sequelize.transaction(async transaction => {
            // check if order exists in db
            let order = await models.StrategyInstanceOrder.findOne({
                where: {
                    account_id: data.account,
                    symbol: dataTrade.symbol,
                    exchange_order_id: dataTrade.order
                },
                lock: transaction.LOCK.UPDATE,
                transaction
            });
            
            if (order == null) {
                // if not exist create in pending trades for account
                const [order, created] = await models.AccountPendingTrade.findOrCreate({
                    where: {
                        account_id: data.account,
                        symbol: dataTrade.symbol,
                        order_id: dataTrade.order    
                    },
                    defaults: {
                        account_id: data.account,
                        trade: dataTrade.toJson(),
                        timestamp: models.Sequelize.fn('NOW'),
                        trade_id: dataTrade.id,
                        order_id: dataTrade.order,
                        symbol: dataTrade.symbol,
                    },
                    lock: transaction.LOCK.UPDATE, 
                    transaction
                });
            } else {
                // order exists so create trade
                await models.StrategyInstanceTrade.findOrCreate({
                    where: {
                        strategy_instance_order_id: order.id,
                        symbol: dataTrade.symbol,
                        exchange_trade_id: dataTrade.id,    
                    },
                    defaults: {
                        account_id: order.account_id,
                        symbol: order.symbol,
                        exchange_trade_id: dataTrade.id,
                        timestamp: dataTrade.timestamp,
                        datetime: dataTrade.datetime,
                        price: dataTrade.price,
                        amount: dataTrade.amount,
                        cost: dataTrade.cost,
                        fee_cost: dataTrade.feeCost ? dataTrade.feeCost : null,
                        fee_coin: dataTrade.feeCurrency ? dataTrade.feeCurrency : null,
                    },
                    transaction
                });
            }
        });
        // TODO: check if all trades has completed the order ?
    } catch (ex) {
        console.error(ex);
    }
    done(null, { message: "trade executed" });
});


// wait for orders from redis server
myOrdersQueue.process(async (job, done) => {
    /** @type {OrderDataEvent} */
    let data = job.data;
    let dataOrder = BaseExchangeCcxtOrder.fromJson(data.order);
    console.log(data);
    let gridUpdate = false;
    let orderInstance = null;
    try {
        await models.sequelize.transaction(async transaction => {
            // check if order exists in db
            let order = await models.StrategyInstanceOrder.findOne({
                where: {
                    account_id: data.account,
                    symbol: dataOrder.symbol,
                    exchange_order_id: dataOrder.id
                },
                lock: transaction.LOCK.UPDATE,
                transaction
            });
            
            if (order == null) {
                // if not exist create in pending orders for account
                const [order, created] = await models.AccountPendingOrder.findOrCreate({
                    where: {
                        account_id: data.account,
                        symbol: dataOrder.symbol,
                        order_id: dataOrder.id    
                    },
                    defaults: {
                        account_id: data.account,
                        order: dataOrder.toJson(),
                        timestamp: models.Sequelize.fn('NOW'),
                        order_id: dataOrder.id,
                        symbol: dataOrder.symbol,
                    },
                    lock: transaction.LOCK.UPDATE, 
                    transaction
                });

                if (!created) {
                    let orderStatusesPreceding = {
                        'open' : [],
                        'canceled': ['open'],
                        'rejected': ['open'],
                        'expired': ['open'],
                        'closed': ['open', ],
                    };
                    let dbOrder = BaseExchangeCcxtOrder.fromJson(order.order);
                    if (dbOrder.status == 'open') {
                        order.order = dataOrder.toJson();
                        order.timestamp = models.Sequelize.fn('NOW');
                        await order.save({transaction});
                    }
                }
            } else {
                orderInstance = order.strategy_instance_id;
                // already exists, update if necesary
                if (order.status == 'open') {
                    order.timestamp = dataOrder.timestamp;
                    order.datetime = dataOrder.datetime;
                    order.status = dataOrder.status;
                    order.price = dataOrder.price;
                    order.amount = dataOrder.amount;
                    order.cost = dataOrder.cost;
                    order.average = dataOrder.average;
                    order.filled = dataOrder.filled;
                    order.remaining = dataOrder.remaining;
                    console.log(order.id)
                    await order.save({transaction});
                    console.log(order.id)
                    gridUpdate = true;
                }
                // if closed update grid
                // if not closed nor open, event
            }
        });

        if (gridUpdate) {
            const strategyInstance = await models.StrategyInstance.findOne({
                where: {
                    id: orderInstance,
                    running: true,
                    stop_requested_at: { [models.Sequelize.Op.is]: null }
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

            if (strategyInstance == null) {
                console.log(`${orderInstance} instance for account ${data.account} not found or not running`);
            } else {
                // create exchange
                let account = strategyInstance.strategy.account;
                const exchange = await exchangeInstanceWithMarkets(account.exchange.exchange_name, {
                    exchangeType: account.account_type.account_type,
                    paper: account.paper,
                    rateLimit: 1000,  // testing 1 second though it is not recommended (I think we should not send too many requests/second)
                    apiKey: account.api_key,
                    secret: account.api_secret,
                });

                let gridCreator = new GridManager(exchange, strategyInstance.id, strategyInstance.strategy)
                gridCreator.handleOrder(dataOrder);
            }
            // search order id in grid
            // if it is a buy
        }
    } catch (ex) {
        console.error(ex);
    }

    done(null, { message: "order executed" });
});

// wait for balance from redis server
myBalanceQueue.process(async (job, done) => {
    /** @type {BalanceDataEvent} */
    let data = job.data;
    console.log(data);
    done(null, { message: "balance executed" });
});

// query database for start/stop grids
const startStopProcess = cancelablePromise(async (resolve, reject, signal) => {
    let cancelled = false;

    signal.catch(err => {
        cancelled = true;
    });

    while (!cancelled) {
        await stopGrids(() => cancelled)

        await startGrids(() => cancelled);

        if (cancelled) break;
        await sleep(10000);
    }   
});

startStopProcess.promise
    .then( res => console.log(res))
    .catch(ex => console.error(ex));

async function startGrids(isCancelled) {
    if (isCancelled()) return;

    const instances = await models.StrategyInstance.findAll({
        where: {
            running: true,
            started_at: { [models.Sequelize.Op.is]: null },
            stop_requested_at: { [models.Sequelize.Op.is]: null }
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
        try {
            let instance = instances[i];
            let strategy = instance.strategy;
            let account = strategy.account;

            instance.started_at = models.Sequelize.fn('NOW');
            instance.save();

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
                continue;
            }

            let gridCreator = new GridManager(exchange, instance.id, strategy)
            let entries = gridCreator.createGridEntries(currentPrice);
            for (let i=0;i<entries.length;i++) {
                models.StrategyInstanceGrid.create(entries[i]);
            }
            gridCreator.createInitialOrders(entries);
        } catch (ex) {
            console.error(ex);
        }
    }
}

async function stopGrids(isCancelled) {
    if (isCancelled()) return;

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

        instance.running = false;
        instance.stopped_at = models.Sequelize.fn('NOW');
        instance.save();

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
            console.error(ex);
        }
    }
}

async function getPosition(exchange, symbol, accountType) {
    let position = null;
    if (accountType == 'spot') {
        console.log('Fetching balance...');
        let balance = await exchange.fetchBalance();
        console.log(balance);
        let market = exchange.market(symbol);
        console.log(market);
        if (market != null) {
            position = balance.total[market.base];
        }
    } else {
        console.log('Fetching positions...');
        let positions = await exchange.fetchPositions(symbol);
        console.log(positions);
        if (positions.length > 0) {
            position = positions[0].contracts;
        }
    }

    return position;
}