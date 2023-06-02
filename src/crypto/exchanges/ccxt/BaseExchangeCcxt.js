
const {BaseExchange} = require("../BaseExchange");
const exc = require('../exceptions/ExchangeError');
const ccxt = require('ccxt');
const _ = require("lodash");
const {BaseExchangeCcxtOrder} = require('./BaseExchangeCcxtOrder');
const {BaseExchangeCcxtPosition} = require('./BaseExchangeCcxtPosition');
const {BaseExchangeCcxtTrade} = require('./BaseExchangeCcxtTrade');
const {overrides} = require('./override');

/** @typedef {import('../BaseExchange').ExchangeOptions} ExchangeOptions */

/**
 * @class
 */
class BaseExchangeCcxt extends BaseExchange {
    /**
     * 
     * @param {string} exchangeName 
     * @param {ExchangeOptions} params 
     */
    constructor(exchangeName, params = {}) {
        super(_.extend({
            verbose: false,
            exchangeType: "spot",
            paper: false,
        }, params));
        /** @type {string} */
        this.exchangeName = exchangeName;

        if (!ccxt.hasOwnProperty(exchangeName)) {
            throw new exc.ExchangeNotFoundError("Ccxt exchange is not valid")
        } 

        let ccxtOptions = _.pickBy({
            verbose: this.params.verbose,
            exchangeType: this.params.exchangeType,
            apiKey: this.params.apiKey,
            secret: this.params.secret,
            rateLimit: this.params.rateLimit,
        }, _.identity);;

        if (overrides.hasOwnProperty(exchangeName)) {
            console.log(`${exchangeName} overrided with custom implementation`)
            /** @type {ccxt.Exchange} */
            this.ccxtExchange = new overrides[exchangeName](ccxtOptions);

        } else {
            /** @type {ccxt.Exchange} */
            this.ccxtExchange = new ccxt.pro[exchangeName](ccxtOptions);
        }
    }

    /** @inheritdoc */
    amountToPrecision(symbol, amount) {
        return this.ccxtExchange.amountToPrecision(symbol, amount);
    }

    /** @inheritdoc */
    async cancelOrder(id, symbol = null) {
        return await this.ccxtExchange.cancelOrder(id, symbol);
    }
    
    /** @inheritdoc */
    async close() {
        return await this.ccxtExchange.close();
    }

    /** @inheritdoc */
    async createOrder(symbol, type, side, amount, price = null) {
        return new BaseExchangeCcxtOrder(
            await this.ccxtExchange.createOrder(
                symbol,
                type,
                side,
                amount,
                price
            )
        );
    }

    /** @inheritdoc */
    async fetchBalance() {
        return await this.ccxtExchange.fetchBalance();
    }
    
    /** @inheritdoc */
    async fetchCurrentPrice(symbol) {
        let trades = await this.fetchTrades(symbol, undefined, 1);
        if (trades.length == 0) {
            return null;
        }
        
        return trades[0].price;
    }

    /** @inheritdoc */
    async fetchOrder(id, symbol = undefined) {
        return new BaseExchangeCcxtOrder(
            await this.ccxtExchange.fetchOrder(id, symbol)
        );
    }

    /** @inheritdoc */
    async fetchPositions(symbol = undefined) {
        let positions = await this.ccxtExchange.fetchPositions(symbol);
        let newPositions = [];
        positions.forEach(p => {
            newPositions.push(new BaseExchangeCcxtPosition(p));
        })

        return newPositions;
    }

    /** @inheritdoc */
    async fetchTrades(symbol, since = undefined, limit = undefined) {
        let trades = await this.ccxtExchange.fetchTrades(symbol, since, limit);
        let newTrades = [];
        trades.forEach(t => {
            newTrades.push(new BaseExchangeCcxtTrade(t));
        })

        return newTrades;
    }

    /** @inheritdoc */
    getId() {
        return this.ccxtExchange.id;
    }

    /** @inheritdoc */
    async getMarkets() {
        return await this.ccxtExchange.loadMarkets();
    }

    /** @inheritdoc */
    async loadMarkets(reload = false) {
        return await this.ccxtExchange.loadMarkets(reload);
    }

    /** @inheritdoc */
    mainWalletAccountType() {
        return 'spot';
    }

    /** @inheritdoc */
    market(symbol) {
        return this.ccxtExchange.market(symbol);
    }

    /** @inheritdoc */
    get markets() {
        return this.ccxtExchange.markets;
    }

    /** @inheritdoc */
    priceToPrecision(symbol, price) {
        return this.ccxtExchange.priceToPrecision(symbol, price);
    }

    /** @inheritdoc */
    async initMarketsFrom(exchange) {
        if (this.exchangeName != exchange.exchangeName) {
            throw new Exception("Exchange not compatible");
        }

        this.ccxtExchange.setMarkets(await exchange.ccxtExchange.loadMarkets());
    }

    /** @inheritdoc */
    async initMarkets(markets) {
        this.ccxtExchange.setMarkets(markets);
    }

    /** @inheritdoc */
    async watchBalance(accountType = undefined) {
        return await this.ccxtExchange.watchBalance(accountType);
    }

    /** @inheritdoc */
    async watchMyOrders(symbol = undefined){
        let orders = await this.ccxtExchange.watchOrders(symbol);

        let newOrders = [];
        orders.forEach(o => {
            newOrders.push(new BaseExchangeCcxtOrder(o));
        })

        return newOrders;
    }

    /** @inheritdoc */
    async watchMyTrades(symbol = undefined) {
        let trades = await this.ccxtExchange.watchMyTrades(symbol);

        let newTrades = [];
        trades.forEach(t => {
            newTrades.push(new BaseExchangeCcxtTrade(t));
        })

        return newTrades;
    }
    
    /** @inheritdoc */
    async watchTrades(symbol) {
        let trades = await this.ccxtExchange.watchTrades(symbol);
        let newTrades = [];
        trades.forEach(t => {
            newTrades.push(new BaseExchangeCcxtTrade(t));
        })

        return newTrades;
    }


}

module.exports = {
    BaseExchangeCcxt
}