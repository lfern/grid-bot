const { balanceHandler } = require("../grid/redis-events");

/** @typedef {import("../grid/exchange-events").BalanceDataEvent} BalanceDataEvent */

exports.balanceWorker = async (job, done) => {
    /** @type {BalanceDataEvent} */
    let data = job.data;
    console.log("Balance:", data);
    try {
        await balanceHandler(data.account, data.balance, data.accountType);
    } catch (ex) {
        console.error("Error processing balance event:", ex);
    }
    
    done(null, { message: "balance executed" });
};