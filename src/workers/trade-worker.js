const { InstanceAccountRepository } = require("../../repository/InstanceAccountingRepository");
const { PendingAccountRepository } = require("../../repository/PendingAccountRepository");
const { BaseExchangeCcxtTrade } = require("../crypto/exchanges/ccxt/BaseExchangeCcxtTrade");

/** @typedef {import('../services/TradeEventService').TradeDataEvent} TradeDataEvent */

exports.tradeWorker = async (job, done) => {
    /** @type {TradeDataEvent} */
    let data = job.data;
    let delayed = job.delayed
    let dataTrade = BaseExchangeCcxtTrade.fromJson(data.trade);
    console.log(`TradeWorker: received trade ${dataTrade.id} ${dataTrade.side} ${dataTrade.symbol} ${dataTrade.order} ${delayed?'delayed':''}`);
    try {
        let instanceAccountRepository = new InstanceAccountRepository();
        let pendingAccountRepository = new PendingAccountRepository();
        await instanceAccountRepository.createTrade(data.account, dataTrade);

        if (delayed === true) {
            let fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 3600); // five minutes ago
            console.log(`RecoverTradesWorker: ${fiveMinutesAgo.toISOString()} ${dataTrade.datetime}`);
            if (new Date(dataTrade.timestamp) < fiveMinutesAgo) {
                console.log(`RecoverTradesWorker: account ${data.account} ${dataTrade.id} ${dataTrade.datetime} removed after 5 minutes`);
                await pendingAccountRepository.removeTrade(data.account, dataTrade);
            }             
        }
    } catch (ex) {
        console.error("TradeWorker:", ex);
    }
    done(null, { message: "trade executed" });
};