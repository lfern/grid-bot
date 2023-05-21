const {BaseExchangeOrder} = require('./BaseExchangeOrder');
/**
 * ExchangeOptions type definitions
 * @typedef {Object} ExchangeOptions
 * @property {boolean} [verbose]
 * @property {string} [exchangeType]
 * @property {string} [apikey]
 * @property {string} [secret]
 */

/**
 * Base exchange class
 */
class BaseExchange {
    /**
     * 
     * @param {ExchangeOptions} params 
     */
    constructor(params = {}) {
        /** @type {ExchangeOptions} */
        this.params = params;
    }

    /**
     * Cancel order
     * @param {string} id 
     * @param {string | undefined} symbol 
     */
    async cancelOrder(id, symbol = null) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     */
     close() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
    * Create order
    * @param {string} symbol 
    * @param {'market'|'limit'|string} type 
    * @param {'buy'|'sell'|string} side 
    * @param {float} amount 
    * @param {float} price 
    * @returns {BaseExchangeOrder}
    */
    async createOrder(symbol, type, side, amount, price = null) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string} id 
     * @param {string | undefined} symbol 
     * @returns {BaseExchangeOrder}
     */
    async fetchOrder(id, symbol = null) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {boolean} reload 
     * @returns 
     */
    async loadMarkets(reload = false) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Watch my trades
     * @param {string|undefined} symbol 
     * @returns {[BaseExchangeTrade]}
     */
    async watchMyTrades(symbol = null){
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string} symbol 
     * @returns {[BaseExchangeTrade]}
     */
    async watchTrades(symbol){
        throw new Error("NOT IMPLEMENTED");
    }
}

module.exports = { BaseExchange };