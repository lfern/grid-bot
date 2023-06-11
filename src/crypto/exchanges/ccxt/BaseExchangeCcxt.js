
const {BaseExchange} = require("../BaseExchange");
const exc = require('../exceptions/ExchangeError');
const ccxt = require('ccxt');
const _ = require("lodash");
const {BaseExchangeCcxtOrder} = require('./BaseExchangeCcxtOrder');
const {BaseExchangeCcxtPosition} = require('./BaseExchangeCcxtPosition');
const {BaseExchangeCcxtTrade} = require('./BaseExchangeCcxtTrade');
const {overrides} = require('./override');
const { SimpleThrottlerCache } = require("./throttlers/SimpleThrottlerCache");

/** @typedef {import('../BaseExchange').ExchangeOptions} ExchangeOptions */

let cacheThrottler = new SimpleThrottlerCache();

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
            timeout: 10000,
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
            timeout: this.params.timeout,
        }, _.identity);

        if (overrides.hasOwnProperty(exchangeName)) {
            console.log(`${exchangeName} overrided with custom implementation`)
            /** @type {ccxt.Exchange} */
            this.ccxtExchange = new overrides[exchangeName](ccxtOptions);

        } else {
            /** @type {ccxt.Exchange} */
            this.ccxtExchange = new ccxt.pro[exchangeName](ccxtOptions);
        }

        let hash = this.getThrottlerHash(this.params.exchangeType, this.params.paper);
        let throttler = cacheThrottler.getThrottler(hash);
        if (throttler != null) {
            this.ccxtExchange.throttler = throttler;
        } else {
            cacheThrottler.setThrottler(hash, this.ccxtExchange.throttler);
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

    /** @inheritdoc  */
    async fetchClosedOrder(id, symbol = undefined) {
        return new BaseExchangeCcxtOrder(
            await this.ccxtExchange.fetchClosedOrder(id, symbol)
        );
    }

    /** @inheritdoc */
    async fetchOpenOrder(id, symbol = undefined) {
        return new BaseExchangeCcxtOrder(
            await this.ccxtExchange.fetchOpenOrder(id, symbol)
        );
    }

    /** @inheritdoc */
    async fetchOrder(id, symbol = undefined) {
        return new BaseExchangeCcxtOrder(
            await this.ccxtExchange.fetchOrder(id, symbol)
        );
    }

    /** @inheritdoc */
    async fetchOrderTrades(id, symbol) {
        let trades = await this.ccxtExchange.fetchOrderTrades(id, symbol);
        let newTrades = [];
        trades.forEach(t => {
            newTrades.push(new BaseExchangeCcxtTrade(t));
        })

        return newTrades;
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
    getInternalMarketsInfo() {
        return {
            markets: this.ccxtExchange.markets,
            currencies: this.ccxtExchange.currencies,
        }
    }

    /**
     * 
     * @param {string} exchangeType 
     * @param {boolean} paper 
     */
    getThrottlerHash(exchangeType, paper) {
        throw new Error("NOT IMPLEMENTED");
    }

    /** @inheritdoc */
    getWalletNames() {
        return Object.keys(this.ccxtExchange.accountsById);
    }
    
    /** @inheritdoc */
    initMarketsFrom(exchange) {
        if (this.exchangeName != exchange.exchangeName) {
            throw new Exception("Exchange not compatible");
        }

        let internalMarkets = this.getInternalMarketsInfo();
        this.ccxtExchange.setMarkets(internalMarkets.markets, internalMarkets.currencies);
    }

    /** @inheritdoc */
    async initMarkets(internalMarkets) {
        this.ccxtExchange.setMarkets(internalMarkets.markets, internalMarkets.currencies);
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
    get symbols() {
        return Object.keys(this.ccxtExchange.markets);
    }


    /** @inheritdoc */
    async transfer(code, amount, fromAccount, toAccount) {
        await this.ccxtExchange.transfer(code, amount, fromAccount, toAccount);
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