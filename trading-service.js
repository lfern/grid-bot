const { cancelablePromise } = require('./src/crypto/exchanges/utils/procutils');
const Queue = require("bull");
require('dotenv').config();
//const {DbHelper} = require('./src/db/DbHelper');
const {sleep} = require('./src/crypto/exchanges/utils/timeutils');
const models = require('./models');
const { exchangeInstance } = require('./src/crypto/exchanges/exchanges');
const _ = require('lodash');
const BigNumber = require('bignumber.js');
const { GridManager } = require('./src/grid/grid');

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
    console.log(job.data);
    done(null, { message: "trade executed" });
});


// wait for trades from redis server
myOrdersQueue.process(async (job, done) => {
    console.log(job.data);
    done(null, { message: "order executed" });
});

// wait for trades from redis server
myBalanceQueue.process(async (job, done) => {
    console.log(job.data);
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
            const exchange = exchangeInstance(account.exchange.exchange_name, {
                exchangeType: account.account_type.account_type,
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

            let gridCreator = new GridManager(exchange, instance.id, strategy, currentPrice)
            let entries = gridCreator.createGridEntries();
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
        const exchange = exchangeInstance(account.exchange.exchange_name, {
            exchangeType: account.account_type.account_type,
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