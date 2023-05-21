const { cancelablePromise } = require('./src/crypto/exchanges/utils/procutils');
const Queue = require("bull");
require('dotenv').config();
const {DbHelper} = require('./src/db/DbHelper')

const dbHelper = new DbHelper(
    process.env.POSTGRES_USERNAME,
    process.env.POSTGRES_HOSTNAME,
    process.env.POSTGRES_DB,
    process.env.POSTGRES_PASSWORD,
    process.env.POSTGRES_PORT,
);

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
    // stop these grids
    const toBeStoppedInstances = await dbHelper.client.query(`
        SELECT * FROM instances WHERE running = true AND 
            stopped_at = null AND stop_requested_at != null
    `);

    // Start new grids
    const newInstances = await dbHelper.client.query(`
        SELECT * FROM instances WHERE running = true AND started_at = null
    `);
});

startStopProcess.promise
    .then( res => console.log(res))
    .catch(ex => console.error(ex));