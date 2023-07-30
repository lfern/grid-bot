require('dotenv').config();
const {initLogger, captureConsoleLog} = require("./src/utils/logger");

initLogger(
    process.env.LOGGER_SERVICE_ALL_FILE || 'logs/sync-all.log' ,
    process.env.LOGGER_SERVICE_ERROR_FILE || 'logs/sync-error.log',
);

captureConsoleLog();

const Queue = require("bull");
const { sleep } = require("./src/crypto/exchanges/utils/timeutils");
const {NotificationEventService} = require('./src/services/NotificationEventService');
const { LEVEL_CRITICAL } = require("./repository/StrategyInstanceEventRepository");
const { AccountSyncRepository } = require("./repository/AccountSyncRepository");
const { exchangeSyncInstance } = require("./src/sync/accounting/exchanges");
const Redis = require("ioredis");
const { exchangeInstanceWithMarketsFromAccount } = require('./src/services/ExchangeMarket');


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

const myNotificationQueue = new Queue("myNotification", opts);

NotificationEventService.init(myNotificationQueue);

NotificationEventService.send("SyncService", LEVEL_CRITICAL, "Service started");

const repository = new AccountSyncRepository();

new Promise(async (resolve, reject) => {
    while (true) {
        let account = null;
        try {
            // TODO: pending to lock when multiple processes enabled

            // get oldest synced account for exchanges
            // that has not been synced in last x minutes
            account = await repository.getNextAccountToSync();

            if (account != null) {
                console.log(`SyncService: start syncing ${account.id}`);
                const exchange = await exchangeInstanceWithMarketsFromAccount(account);
                // exchange.ccxtExchange.verbose = true;
                const exchangeSync = exchangeSyncInstance(exchange);
                await exchangeSync.sync(account.id);
            }

        } catch (ex) {
            console.error(`SyncService: ${ex.message}`, ex);
            NotificationEventService.send("SyncService", LEVEL_CRITICAL, ex.message);
        } finally {
            if (account != null) {
                console.log(`SyncService: endsyncing ${account.id}`);
            }
        }

        await sleep(5000)
    }

    resolve();
}).then(res => console.log("Process finished"))
.catch(ex => console.error(ex));

