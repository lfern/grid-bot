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
    get takerOrMaker() {
        return this.ccxtTrade.takerOrMaker;
    }

    /** @inheritdoc */
    get timestamp() {
        return this.ccxtTrade.timestamp;
    }

    /** @inheritdoc */
    get account() {
        return this.ccxtTrade.account;
    }

    /** @inheritdoc */
    get wallet() {
        return this.ccxtTrade.wallet;
    }

    /** @inheritdoc */
    set amount(d) {
        this.ccxtTrade.amount = d;
    }

    /** @inheritdoc */
    set cost(d) {
        this.ccxtTrade.cost = d;
    }

    /** @inheritdoc */
    set datetime(d) {
        this.ccxtTrade.datetime = d;
    }

    /** @inheritdoc */
    set feeCost(d) {
        this.ccxtTrade.fee.cost = d;
    }

    /** @inheritdoc */
    set feeCurrency(d) {
        this.ccxtTrade.fee.currency = d;
    }

    /** @inheritdoc */
    set id(d) {
        this.ccxtTrade.id = d;
    }

    /** @inheritdoc */
    set order(d) {
        this.ccxtTrade.order = d;
    }

    /** @inheritdoc */
    set price(d) {
        this.ccxtTrade.price = d;
    }

    /** @inheritdoc */
    set side(d) {
        this.ccxtTrade.side = d;
    }

    /** @inheritdoc */
    set symbol(d) {
        this.ccxtTrade.symbol = d;
    }

    /** @inheritdoc */
    set takerOrMaker(d) {
        this.ccxtTrade.takerOrMaker = d;
    }

    /** @inheritdoc */
    set timestamp(d) {
        this.ccxtTrade.timestamp = d;
    }

    /** @inheritdoc */
    set account(d) {
        this.ccxtTrade.account = d;
    }

    /** @inheritdoc */
    set wallet(d) {
        this.ccxtTrade.wallet = d;
    }

    /** @inheritdoc */
    toJson() {
        return this.ccxtTrade;
    }
    
    /** @inheritdoc */
    static fromJson(json) {
        return new BaseExchangeCcxtTrade(json);
    }
}

module.exports = {BaseExchangeCcxtTrade}