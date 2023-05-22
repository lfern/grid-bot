const { cancelablePromise } = require('./src/crypto/exchanges/utils/procutils');
const Queue = require("bull");
require('dotenv').config();
//const {DbHelper} = require('./src/db/DbHelper');
const {sleep} = require('./src/crypto/exchanges/utils/timeutils');
const models = require('./models');
const { exchangeInstance } = require('./src/crypto/exchanges/exchanges');
/*
const dbHelper = new DbHelper(
    process.env.POSTGRES_USERNAME,
    process.env.POSTGRES_HOSTNAME,
    process.env.POSTGRES_DB,
    process.env.POSTGRES_PASSWORD,
    process.env.POSTGRES_PORT,
);
*/
const myTradesQueue = new Queue("myTrades", {
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
// TODO: wait for balance updates from redis

// query database for start/stop grids
const startStopProcess = cancelablePromise(async (resolve, reject, signal) => {
    let cancelled = false;

    signal.catch(err => {
        cancelled = true;
    });

    while (!cancelled) {
        //const toBeStoppedInstances = await dbHelper.client.query(`
        //SELECT * FROM instances WHERE running = true AND 
        //    stopped_at = null AND stop_requested_at != null
        //`);

        // TODO: stop (cancel orders and update db)
        await stopGrids(() => cancelled)

        // Start new grids
        //const newInstances = await dbHelper.client.query(`
        //SELECT * FROM instances WHERE running = true AND started_at = null
        //`); 

        // TODO: start (create grid in db, send orders and check something changed while is sending: order executed or cancelled)
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
        let instance = instances[i];
        let strategy = instance.strategy;
        let account = strategy.account;
        let accountType = account.account_type;
        console.log(instance);
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
        let trades = await exchange.fetchTrades(strategy.symbol, undefined, 1);
        if (trades.length == 0) {
            console.error("Could not get current price from exchange")
            continue;
        }
        let currentPrice = trades[0].price;

        let position = strategy.initial_position;
        for (let i=0; i < strategy.sell_orders; i++) {
            let gridPrice = exchange.priceToPrecision(
                strategy.symbol,
                currentPrice + (i+1) * currentPrice * strategy.step / 100
            );

            let buyId = strategy.sell_orders - i - 1;
            var cost = exchange.priceToPrecision(
                strategy.symbol,
                strategy.order_qty * gridPrice
            );

            let orderQty = exchange.amountToPrecision(strategy.symbol, strategy.order_qty);

            let newSell = {
                strategy_instance_id: instance.id,
                price: gridPrice,
                buy_order_id: buyId,
                buy_order_qty: orderQty,
                buy_order_cost: cost,
                sell_order_id: buyId + 1,
                sell_order_qty: orderQty,
                sell_order_cost: cost,
            };
/*
            newBuy = _.extend(newBuy, {
                position_before_order: position,
                order_qty:,
                side:,
                active:,
                exchange_order_id:,

            });

            position += strategy.order_qty;*/

            models.StrategyInstanceGrid.create(newSell);
        }

        for (let i=0; i<strategy.buy_orders; i++) {
            let gridPrice = exchange.priceToPrecision(
                strategy.symbol,
                currentPrice - (i+1) * currentPrice * strategy.step / 100
            );

            let buyId = strategy.sell_orders + i;
            let cost = exchange.priceToPrecision(
                strategy.symbol,
                strategy.order_qty * gridPrice
            );

            let orderQty = exchange.amountToPrecision(strategy.symbol, strategy.order_qty);

            let newBuy = {
                strategy_instance_id: instance.id,
                price: gridPrice,
                buy_order_id: buyId,
                buy_order_qty: orderQty,
                buy_order_cost: cost,
                sell_order_id: buyId + 1,
                sell_order_qty: orderQty,
                sell_order_cost: cost,
            };
/*
            newBuy = _.extend(newBuy, {
                position_before_order: position,
                order_qty:,
                side:,
                active:,
                exchange_order_id:,

            });

            position += strategy.order_qty;*/

            models.StrategyInstanceGrid.create(newBuy);
        
        }
        // Create orders loop, checking if some order is executed and checking if someone stopped the grid meamwhile
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
        let accountType = account.account_type;

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
            let position = getPosition(exchange, strategy.symbol, accountType.account_type);
            
            let trades = await exchange.fetchTrades(strategy.symbol, undefined, 1);
            let currentPrice = null;
            if (trades.length > 0) {
                console.log(trades);
                console.log(trades[0].price)
                currentPrice = trades[0].price;
            }

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
            // TODO: cancel orders
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