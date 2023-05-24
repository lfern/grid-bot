const {BaseExchangeOrder} = require('../BaseExchangeOrder');
const {BaseExchangeCcxtTrade} = require('./BaseExchangeCcxtTrade');
const ccxt = require('ccxt');

class BaseExchangeCcxtOrder extends BaseExchangeOrder {
    /**
     * 
     * @param {ccxt.Order} ccxtOrder 
     */
    constructor(ccxtOrder) {
        super();
        /** @type {ccxt.Order} */
        this.ccxtOrder = ccxtOrder;
    }

    /** @inheritdoc */
    get amount() {
        return this.ccxtOrder.amount;
    }

    /** @inheritdoc */
    get average() {
        return this.ccxtOrder.average;
    }

    /** @inheritdoc */
    get cost() {
        return this.ccxtOrder.cost;
    }

    /** @inheritdoc */
    get datetime() {
        return this.ccxtOrder.datetime
    }

    /** @inheritdoc */
    get feeCost() {
        return this.ccxtOrder.fee.cost;
    }

    /** @inheritdoc */
    get feeCurrency() {
        return this.ccxtOrder.fee.currency;
    }

    /** @inheritdoc */
    get filled() {
        return this.ccxtOrder.filled;
    }

    /** @inheritdoc */
    get id() {
        return this.ccxtOrder.id;
    }

    /** @inheritdoc */
    get price() {
        return this.ccxtOrder.price;
    }

    /** @inheritdoc */
    get remaining() {
        return this.ccxtOrder.remaining;
    }

    /** @inheritdoc */
    get side() {
        return this.ccxtOrder.side;
    }

    /** @inheritdoc */
    get status() {
        return this.ccxtOrder.status;
    }

    /** @inheritdoc */
    get symbol() {
        return this.ccxtOrder.symbol;
    }


    /** @inheritdoc */
    get timestamp() {
        return this.ccxtOrder.timestamp;
    }

    /** @inheritdoc */
    get trades() {
        let trades = [];
        this.ccxtOrder.trades.forEach((t) => {
            trades.push(new BaseExchangeCcxtTrade(t));
        });

        return trades;
    }

    /** @inheritdoc */
    get type() {
        return this.ccxtOrder.type;
    }
    
    /** @inheritdoc */
     toJson() {
        return this.ccxtOrder;
    }

    /** @inheritdoc */
    static fromJson(json) {
        return new BaseExchangeCcxtOrder(json);
    }
}


module.exports = { BaseExchangeCcxtOrder }