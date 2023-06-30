const { InstanceAccountRepository } = require("../../repository/InstanceAccountingRepository");
const { BaseExchangeCcxtTrade } = require("../crypto/exchanges/ccxt/BaseExchangeCcxtTrade");

/** @typedef {import('./src/services/TradeEventService').TradeDataEvent} TradeDataEvent */

exports.tradeWorker = async (job, done) => {
    /** @type {TradeDataEvent} */
    let data = job.data;
    let dataTrade = BaseExchangeCcxtTrade.fromJson(data.trade);
    console.log(`TradeWorker: received trade ${dataTrade.id} ${dataTrade.side} ${dataTrade.symbol} ${dataTrade.order}`);
    try {
        let instanceAccountRepository = new InstanceAccountRepository();
        await instanceAccountRepository.createTrade(data.account, dataTrade);
        // TODO: check if all trades has completed the order ?
    } catch (ex) {
        console.error("TradeWorker:", ex);
    }
    done(null, { message: "trade executed" });
};