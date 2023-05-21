const ccxt = require('ccxt');

class BaseExchangeCcxtTrade {
    /**
     * 
     * @param {ccxt.Trade} ccxtTrade 
     */
    constructor(ccxtTrade) {
        /** @type {ccxt.Trade} */
        this.ccxtTrade = ccxtTrade;
    }

    /** @inheritdoc */
    get amount() {
        this.ccxtTrade.amount;
    }

    /** @inheritdoc */
    get cost() {
        this.ccxtTrade.cost;
    }

    /** @inheritdoc */
    get datetime() {
        this.ccxtTrade.datetime;
    }

    /** @inheritdoc */
    get feeCost() {
        this.ccxtTrade.fee.cost;
    }

    /** @inheritdoc */
    get feeCurrency() {
        this.ccxtTrade.fee.currency;
    }

    /** @inheritdoc */
    get id() {
        this.ccxtTrade.id;
    }

    /** @inheritdoc */
    get order() {
        this.ccxtTrade.order;
    }

    /** @inheritdoc */
    get price() {
        this.ccxtTrade.price;
    }

    /** @inheritdoc */
    get side() {
        this.ccxtTrade.side;
    }

    /** @inheritdoc */
    get symbol() {
        this.ccxtTrade.symbol;
    }

    /** @inheritdoc */
    get timestamp() {
        this.ccxtTrade.timestamp;
    }

    /** @inheritdoc */
    toJson() {
        return this.ccxtTrade;
    }
    

}

module.exports = {BaseExchangeCcxtTrade}