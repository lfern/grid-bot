const ccxt = require('ccxt');
const {BaseExchangeTrade} = require('../BaseExchangeTrade');

class BaseExchangeCcxtTrade extends BaseExchangeTrade {
    /**
     * 
     * @param {ccxt.Trade} ccxtTrade 
     */
    constructor(ccxtTrade) {
        super();
        /** @type {ccxt.Trade} */
        this.ccxtTrade = ccxtTrade;
    }

    /** @inheritdoc */
    get amount() {
        return this.ccxtTrade.amount;
    }

    /** @inheritdoc */
    get cost() {
        return this.ccxtTrade.cost;
    }

    /** @inheritdoc */
    get datetime() {
        return this.ccxtTrade.datetime;
    }

    /** @inheritdoc */
    get feeCost() {
        return this.ccxtTrade.fee.cost;
    }

    /** @inheritdoc */
    get feeCurrency() {
        return this.ccxtTrade.fee.currency;
    }

    /** @inheritdoc */
    get id() {
        return this.ccxtTrade.id;
    }

    /** @inheritdoc */
    get order() {
        return this.ccxtTrade.order;
    }

    /** @inheritdoc */
    get price() {
        return this.ccxtTrade.price;
    }

    /** @inheritdoc */
    get side() {
        return this.ccxtTrade.side;
    }

    /** @inheritdoc */
    get symbol() {
        return this.ccxtTrade.symbol;
    }

    /** @inheritdoc */
    get timestamp() {
        return this.ccxtTrade.timestamp;
    }

    /** @inheritdoc */
    toJson() {
        return this.ccxtTrade;
    }
    

}

module.exports = {BaseExchangeCcxtTrade}