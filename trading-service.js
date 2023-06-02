const { cancelablePromise } = require('./src/crypto/exchanges/utils/procutils');
const Queue = require("bull");
require('dotenv').config();
const {sleep} = require('./src/crypto/exchanges/utils/timeutils');
const models = require('./models');
const { exchangeInstanceWithMarkets } = require('./src/services/ExchangeMarket');
const _ = require('lodash');
const { GridManager } = require('./src/grid/grid');
const { BaseExchangeCcxtTrade } = require('./src/crypto/exchanges/ccxt/BaseExchangeCcxtTrade');
const { BaseExchangeCcxtOrder } = require('./src/crypto/exchanges/ccxt/BaseExchangeCcxtOrder');
const { PendingAccountRepository } = require('./repository/PendingAccountRepository');
const { InstanceAccountRepository } = require('./repository/InstanceAccountingRepository');
const { orderHandler, balanceHandler } = require('./src/grid/redis-events');
const {logger, captureConsoleLog} = require("./src/utils/logger");
const broadcastTransactionHandler = require('./src/grid/BroadcastTransactionHandler');

captureConsoleLog();

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
    console.log("Trade: ", data);
    try {
        let instanceAccountRepository = new InstanceAccountRepository();
        instanceAccountRepository.createTrade(data.account, dataTrade);
        // TODO: check if all trades has completed the order ?
    } catch (ex) {
        console.error("Error", ex);
    }
    done(null, { message: "trade executed" });
});


// wait for orders from redis server
myOrdersQueue.process(async (job, done) => {
    /** @type {OrderDataEvent} */
    let data = job.data;
    let dataOrder = BaseExchangeCcxtOrder.fromJson(data.order);
    console.log("Order:", data);

    try {
        await orderHandler(data.account, dataOrder);
    } catch (ex) {
        console.error("Error", ex);
    }

    done(null, { message: "order executed" });
});

// wait for balance from redis server
myBalanceQueue.process(async (job, done) => {
    /** @type {BalanceDataEvent} */
    let data = job.data;
    console.log("Balance:", data);
    try {
        await balanceHandler(data.account, data.balance, data.accountType);
    } catch (ex) {
        console.error("Error processing balance event:", ex);
    }
    
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

const recoverPendingOrders = cancelablePromise( async (resolve, reject, signal) => {
    let cancelled = false;

    signal.catch(err => {
        cancelled = true;
    });

    let pendingAccountRepository = new PendingAccountRepository();
    const options = {
        attempts: 0,
        removeOnComplete: true,
        removeOnFail: true,
    };

    while(!cancelled) {
        try {
            let rows = 0;
            
            // remove 5 minutes old orders
            let removed = await pendingAccountRepository.removeNotFoundOrdersOlderThan(5 * 60);
            console.log("Removed ...", removed);

            await models.sequelize.transaction(async (transaction) =>{
                let dbOrders = await pendingAccountRepository.getOldestOrders(50, 5, true, transaction);
                rows = dbOrders.length;
                if (rows == 0) {
                    return;
                }

                console.log(`Recover ${rows} pending orders ....`);

                for(let i=0; i<rows; i++) {
                    let dbOrder = dbOrders[i];
                    console.log(`account: ${dbOrder.account_id} ${dbOrder.order_id}`);
                    myOrdersQueue.add({
                        account: dbOrder.account_id,
                        order: dbOrder.order,
                        recovered: true,
                    }, options).then(ret => {
                        // console.log(ret);
                    }). catch(err => {
                        console.error("Error:", err);
                    });
    
                    await dbOrder.destroy({transaction})
                }
            })

            if (rows == 0) {
                await sleep(5000);
                continue;
            }

        } catch (ex) {
            console.log("Error:", ex);
            await sleep(5000);
        }
        
    }
});

const broadcastTransactionSender = cancelablePromise( async (resolve, reject, signal) => {
    let cancelled = false;

    signal.catch(err => {
        cancelled = true;
    });

    while(!cancelled) {
        try {
            broadcastTransactionHandler.execute(() => cancelled);
        } catch (ex) {
            console.log("Error", ex);
        }

        await sleep(5000);
    }

});

startStopProcess.promise
    .then( res => {
        broadcastTransactionSender.cancel();
        recoverPendingOrders.cancel();
    })
    .catch(ex => {
        console.error("Error:", ex)
        broadcastTransactionSender.cancel();
        recoverPendingOrders.cancel();
    });

recoverPendingOrders.promise
    .then(res => {
        broadcastTransactionSender.cancel();
        startStopProcess.cancel();
    }).catch(ex => {
        console.error("Error:", ex);
        broadcastTransactionSender.cancel();
        startStopProcess.cancel();
    });

broadcastTransactionSender.promise
    .then(res => {
        startStopProcess.cancel();
        recoverPendingOrders.cancel();
    }).catch(ex => {
        console.error("Error:", ex);
        startStopProcess.cancel();
        recoverPendingOrders.cancel();
    });

async function startGrids(isCancelled) {
    if (isCancelled()) return;

    try {

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
                await gridCreator.createOrders(entries);

            } catch (ex) {
                console.error("Error:", ex);
            }
        }
    } catch (ex){
        console.error("Error:", ex);
    }
}

async function stopGrids(isCancelled) {
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