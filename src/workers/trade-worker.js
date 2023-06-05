const { InstanceAccountRepository } = require("../../repository/InstanceAccountingRepository");
const { BaseExchangeCcxtTrade } = require("../crypto/exchanges/ccxt/BaseExchangeCcxtTrade");

/** @typedef {import("../grid/exchange-events").TradeDataEvent} TradeDataEvent */

exports.tradeWorker = async (job, done) => {
    /** @type {TradeDataEvent} */
    let data = job.data;
    let dataTrade = BaseExchangeCcxtTrade.fromJson(data.trade);
    console.log("Trade: ", data);
    try {
        let instanceAccountRepository = new InstanceAccountRepository();
        instanceAccountRepository.createTrade(data.account, dataTrade);
        // TODO: check if all trades has completed the order ?
    } catch (ex) {
        console.error("Error", ex);
    }
    done(null, { message: "trade executed" });
};