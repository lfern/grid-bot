const Queue = require("bull");
require('dotenv').config();
const {logger, captureConsoleLog} = require("./src/utils/logger");
const { balanceWorker } = require('./src/workers/balance-worker');
const { orderWorker } = require('./src/workers/order-worker');
const { tradeWorker } = require('./src/workers/trade-worker');
const Redis = require("ioredis");
const Redlock = require("redlock");
const { orderSenderWorker } = require("./src/workers/order-sender-worker");
const { startStopProcessPromise } = require("./src/workers/start-stop-worker");
const { recoverOrdersWorkerPromise } = require("./src/workers/recover-orders-worker");
const { broadcastWorkerPromise } = require("./src/workers/broadcast-worker");

/** @typedef {import('./src/grid/exchange-events').TradeDataEvent} TradeDataEvent */
/** @typedef {import('./src/grid/exchange-events').OrderDataEvent} OrderDataEvent */
/** @typedef {import('./src/grid/exchange-events').BalanceDataEvent} BalanceDataEvent */

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
                console.log(redisOpts);
                return new Redis(redisConnOpts, redisOpts);
            default:
                throw new Error("Unexpected connection type: ", type);
        }
    },
};

const redisLock = new Redis(redisConnOpts);

// Here we pass our client to redlock.
const redlock = new Redlock(
    // You should have one client for each independent  node
    // or cluster.
    [redisLock],
    {
        // The expected clock drift; for more details see:
        // http://redis.io/topics/distlock
        driftFactor: 0.01, // multiplied by lock ttl to determine drift time

        // The max number of times Redlock will attempt to lock a resource
        // before erroring.
        retryCount: 120,

        // the time in ms between attempts
        retryDelay: 1000, // time in ms

        // the max time in ms randomly added to retries
        // to improve performance under high contention
        // see https://www.awsarchitectureblog.com/2015/03/backoff.html
        retryJitter: 200, // time in ms

        // The minimum remaining time on a lock before an extension is automatically
        // attempted with the `using` API.
        automaticExtensionThreshold: 500, // time in ms
    }
);


const myTradesQueue = new Queue("myTrades", opts);

const myOrdersQueue = new Queue("myOrders", opts);

const myBalanceQueue = new Queue("myBalance", opts);

const myOrderSenderQueue = new Queue("myOrderSender", opts);

// wait for trades from redis server
myTradesQueue.process(tradeWorker);

// wait for orders from redis server
myOrdersQueue.process(orderWorker(redlock, myOrderSenderQueue));

// wait for balance from redis server
myBalanceQueue.process(balanceWorker);

myOrderSenderQueue.process(orderSenderWorker(myOrderSenderQueue, redlock));

// query database for start/stop grids

const promises = [
    startStopProcessPromise(redlock, myOrderSenderQueue),
    recoverOrdersWorkerPromise(myOrdersQueue),
    broadcastWorkerPromise(),
];

Promise.race(promises.map(x => x.promise))
    .then(res => promises.forEach(x => x.cancel()))
    .catch(ex => {
        console.log("Error waiting processes: ", ex);
        promises.forEach(x => x.cancel());
    });


