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
const Redis = require("ioredis");
const {initLogger, captureConsoleLog} = require("./src/utils/logger");
const TradeEventService = require('./src/services/TradeEventService');
const OrderEventService = require('./src/services/OrderEventService');
const BalanceEventService = require('./src/services/BalanceEventService');
const {NotificationEventService} = require('./src/services/NotificationEventService');
const { eventsWatcherBootstrap } = require("./src/bootstrap");

initLogger(
    process.env.LOGGER_SERVICE_ALL_FILE || 'logs/events-all.log' ,
    process.env.LOGGER_SERVICE_ERROR_FILE || 'logs/events-error.log',
);

captureConsoleLog();

const redisConnOpts = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    host: process.env.REDIS_SERVER || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
};

const client = new Redis(redisConnOpts);
const subscriber = new Redis(redisConnOpts);


const opts = {
  // redisOpts here will contain at least a property of
  // connectionName which will identify the queue based on its name
    createClient: function (type, redisOpts) {
        switch (type) {
            case "client":
                return client;
            case "subscriber":
                return subscriber;
            case "bclient":
                return new Redis(redisConnOpts, redisOpts);
            default:
                throw new Error("Unexpected connection type: ", type);
        }
    },
};

const myTradesQueue = new Queue("myTrades", opts);

const myOrdersQueue = new Queue("myOrders", opts);

const myBalanceQueue = new Queue("myBalance", opts);

const myNotificationQueue = new Queue("myNotification", opts);

NotificationEventService.init(myNotificationQueue);

TradeEventService.init(myTradesQueue);
OrderEventService.init(myOrdersQueue);
BalanceEventService.init(myBalanceQueue);

let currentConnections = {};

const removeAccount = function(account) {
    if (account in currentConnections){
        currentConnections[account].balanceWatcherCancel();
        currentConnections[account].tradeWatcherCancel();
        currentConnections[account].orderWatcherCancel();
        if (currentConnections[account].mainBalanceWatcherCancel) {
            currentConnections[account].mainBalanceWatcherCancel();
        }
        currentConnections[account].exchange.close().catch(e => { });
        delete currentConnections[account];
    }
};

eventsWatcherBootstrap().then(res=> console.log("bootstrap executed")).catch(ex => console.error("Error in bootstrap", ex));

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
                        paper: account.paper,
                        exchangeType: account.account_type.account_type,
                        rateLimit: 1000,  // testing 1 second though it is not recommended (I think we should not send too many requests/second)
                        apiKey: account.api_key,
                        secret: account.api_secret,
                        // this is their documented ratelimit according to this page:
                        // https://docs.bitfinex.com/v1/reference#rest-public-orderbook
                        // 'rateLimit': 1000,  # once every second, 60 times per minute – won't work, will throw DDoSProtection
                    });

                    await exchange.loadMarkets();

                    let tradeWatcher = tradeEventHandler(id, exchange);
                    let orderWatcher = orderEventHandler(id, exchange);
                    let balanceWatcher = balanceEventHandler(id, exchange);

                    let connection = {
                        exchange,
                        tradeWatcherCancel: tradeWatcher.cancel,
                        orderWatcherCancel: orderWatcher.cancel,
                        balanceWatcherCancel: balanceWatcher.cancel,
                    };

                    let promises = [
                        tradeWatcher.promise,
                        orderWatcher.promise,
                        balanceWatcher.promise,
                    ]

                    if (exchange.mainWalletAccountType() != account.account_type.account_type) {
                        console.log("Listen Main Balance Events.....")
                        let mainBalanceWatcher = balanceEventHandler(id, exchange, exchange.mainWalletAccountType());
                        connection.mainBalanceWatcherCancel = mainBalanceWatcher.cancel;
                        promises.push(mainBalanceWatcher.promise);
                    }

                    currentConnections[id] = connection;

                    Promise.any(promises).then(res => {
                        console.log(`ws closed for account ${id}, removing client`)
                        removeAccount(id);
                    }).catch(err => {
                        console.log(`ws closed for account ${id} with error, removing client`)
                        console.error("Error:", err);
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
            console.error("Error:", ex);
        }
        await sleep(5000);

    }
})()

