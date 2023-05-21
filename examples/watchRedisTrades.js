const Queue = require("bull");
require('dotenv').config();

const myTradesQueue = new Queue("myTrades", {
    // Redis configuration
    redis: {
        host: process.env.REDIS_SERVER || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
    },
});

myTradesQueue.process(async (job, done) => {
    console.log(job.data);
    done(null, { message: "trade executed" });
});