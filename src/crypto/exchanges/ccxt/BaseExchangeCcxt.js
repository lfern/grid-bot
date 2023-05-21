
const {BaseExchange} = require("../BaseExchange");
const exc = require('../exceptions/ExchangeError');
const ccxt = require('ccxt');
const _ = require("lodash");
const {BaseExchangeCcxtOrder} = require('./BaseExchangeCcxtOrder');
const {BaseExchangeCcxtTrade} = require('./BaseExchangeCcxtTrade');

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
        }, params));
        /** @type {string} */
        this.exchangeName = exchangeName;

        if (!ccxt.hasOwnProperty(exchangeName)) {
            throw new exc.ExchangeNotFoundError("Ccxt exchange is not valid")
        } 
        /** @type {ccxt.Exchange} */
        this.ccxtExchange = new ccxt.pro[exchangeName]({
            verbose: this.params.verbose,
        });
    }

    /** @inheritdoc */
    async cancelOrder(id, symbol = null) {
        return await this.ccxtExchange.cancelOrder(is, symbol);
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
    async fetchOrder(id, symbol = null) {
        return new BaseExchangeCcxtOrder(
            await this.ccxtExchange.fetchOrder(id, symbol)
        );
    }

    /** @inheritdoc */
    async loadMarkets(reload = false) {
        return await this.ccxtExchange.loadMarkets(reload);
    }

    /** @inheritdoc */
    async initMarketsFrom(exchange) {
        if (this.exchangeName != exchange.exchangeName &&
            this.exchangeType != exchange.exchangeType) {
            throw new Exception("Exchange not compatible");
        }

        this.ccxtExchange.setMarkets(await exchange.ccxtExchange.loadMarkets());
    }

    /** @inheritdoc */
    async watchMyTrades(symbol = null) {
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