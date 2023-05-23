const Queue = require("bull");
require('dotenv').config();
const {sleep} = require('./src/crypto/exchanges/utils/timeutils');
const {
    balanceEventHandler,
    orderEventHandler,
    tradeEventHandler
} = require('./src/grid/exchange-events');

const {exchangeInstance} = require('./src/crypto/exchanges/exchanges');
const models = require('./models');

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

let currentConnections = {};

const removeAccount = function(account) {
    if (account in currentConnections){
        currentConnections[account].balanceWatcherCancel();
        currentConnections[account].tradeWatcherCancel();
        //currentConnections[account].orderWatcherCancel();
        currentConnections[account].exchange.close().catch(e => { });
        delete currentConnections[account];
    }
};

(async () => {
    while (true) {
        console.log("Checking postgresql client is connected ...");
        try {
            const accounts = await models.Account.findAll({
                include: [models.Account.Exchange,
                models.Account.AccountType]
            });


            let lastIds = [];
            // Create connections for new accounts
            for(let i=0; i < accounts.length; i++) {
                let account = accounts[i];
                let id = account.id.toString();
                lastIds.push(id);
                if (!(id in currentConnections)) {
                    console.log('New account: ' + account.id);
                    const exchange = exchangeInstance(account.exchange.exchange_name, {
                        exchangeType: account.account_type.account_type,
                        rateLimit: 1000,  // testing 1 second though it is not recommended (I think we should not send too many requests/second)
                        apiKey: account.api_key,
                        secret: account.api_secret,
                        // this is their documented ratelimit according to this page:
                        // https://docs.bitfinex.com/v1/reference#rest-public-orderbook
                        // 'rateLimit': 1000,  # once every second, 60 times per minute – won't work, will throw DDoSProtection
                    });

                    await exchange.loadMarkets();

                    let tradeWatcher = tradeEventHandler(id, exchange, myTradesQueue);
                    let orderWatcher = orderEventHandler(id, exchange, myOrdersQueue);
                    let balanceWatcher = balanceEventHandler(id, exchange, myBalanceQueue);

                    currentConnections[id] = {
                        exchange,
                        tradeWatcherCancel: tradeWatcher.cancel,
                        orderWatcherCancel: orderWatcher.cancel,
                        balanceWatcherCancel: balanceWatcher.cancel
                    };

                    Promise.any([
                        tradeWatcher.promise,
                        orderWatcher.promise,
                        balanceWatcher.promise,
                    ]).then(res => {
                        console.log(`ws closed for account ${id}, removing client`)
                        removeAccount(id);
                    }).catch(err => {
                        console.log(`ws closed for account ${id} with error, removing client`)
                        console.error(err);
                        removeAccount(id);
                    });

                }
            }
            // remove unused accounts 
            let currentIds = Object.keys(currentConnections);
            for (let i = 0; i < currentIds.length; i++) {
                let id = currentIds[i];
                if (!lastIds.includes(id)) {
                    console.log("Removing unused client: " + id);
                    removeAccount(id);
                }
            }

        } catch (ex) {
            console.error(ex);
        }
        await sleep(5000);

    }
})()

