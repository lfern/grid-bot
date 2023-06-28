const {BaseExchangeOrder} = require('./BaseExchangeOrder');
const {BaseExchangePosition} = require('./BaseExchangePosition');
const {BaseExchangeTrade} = require('./BaseExchangeTrade');
const ccxt = require('ccxt');
/**
 * ExchangeOptions type definitions
 * @typedef {Object} ExchangeOptions
 * @property {boolean} [verbose]
 * @property {string} [exchangeType]
 * @property {boolean} [paper]
 * @property {string} [apiKey]
 * @property {string} [secret]
 * @property {int} [rateLimit]
 * @property {int} [timeout]
 */

/**
 * CreateOrderOptions
 * @typedef {Object} CreateOrderOptions
 * @property {number|undefined} leverage 
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
     * 
     * @param {string} symbol 
     * @param {float} amount 
     * @returns {float}
     */
     amountToPrecision(symbol, amount) {
        throw new Error("Not implemented")
    }

    /**
     * 
     * @param {string} symbol 
     * @param {float} amount 
     * @returns {float}
     */
    amountToPrecision2(symbol, amount) {
        throw new Error("Not implemented")
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
     * 
     * @param {string} symbol 
     * @param {float} price 
     * @returns {float}
     */
    costToPrecision(symbol, price) {
        throw new Error("Not implemented")
    }

    /**
    * Create order
    * @param {string} symbol 
    * @param {'market'|'limit'|string} type 
    * @param {'buy'|'sell'|string} side 
    * @param {float} amount 
    * @param {float|undefined} price 
    * @param {CreateOrderOptions} options
    * @returns {BaseExchangeOrder}
    */
    async createOrder(symbol, type, side, amount, price = undefined, options = {}) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     */
    get currencies() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string} symbol 
     * @param {string} side 
     */
    currencyNotFoundForMarket(symbol, side) {
        throw new Exception("NOT IMPLEMENTED")
    }

    /**
     * 
     * @returns {ccxt.Balance}
     */
    async fetchBalance() {
        throw new Error("Not implemented");
    }

    /**
     * @returns {ccxt.Balance}
     */
    async fetchBalanceDepositWallet() {
        throw new Error("Not implemented");
    }

    /**
     * Fetch current price
     * 
     * @param {string} symbol 
     */
    async fetchCurrentPrice(symbol) {
        throw new Error("Not implemented");
    }

    /**
     * 
     * @param {string|undefined} symbol 
     * @param {number|undefined} since 
     * @param {number|undefined} limit 
     * @returns 
     */
    async fetchDeposits(symbol = undefined, since = undefined, limit = undefined) {
        throw new Error("Not implemented");
    }

    /**
     * 
     * @param {string} id 
     * @param {string | undefined} symbol 
     * @returns {BaseExchangeOrder}
     */
    async fetchClosedOrder(id, symbol = undefined) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string|undefined} symbol 
     * @param {number|undefined} since 
     * @param {number|undefined} limit 
     */
    async fetchClosedOrders(symbol = undefined, since = undefined, limit = undefined) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string} id 
     * @param {string | undefined} symbol 
     * @returns {BaseExchangeOrder}
     */
    async fetchOpenOrder(id, symbol = undefined) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string|undefined} symbol 
     * @param {number|undefined} since 
     * @param {number|undefined} limit 
     */
    async fetchOpenOrders(symbol = undefined, since = undefined, limit = undefined) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string} id 
     * @param {string | undefined} symbol 
     * @returns {BaseExchangeOrder}
     */
    async fetchOrder(id, symbol = undefined) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string|undefined} symbol 
     * @param {number|undefined} since 
     * @param {number|undefined} limit 
     * @returns 
     */
    async fetchOrders(symbol = undefined, since = undefined, limit = undefined) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string} id 
     * @param {string} symbol 
     */
    async fetchOrderTrades(id, symbol) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string} symbol
     * @returns {[BaseExchangePosition]}
     */
    async fetchPositions(symbol = undefined) {
        throw new Error("Not implemented");
    }

    /**
     * 
     * @param {string} symbol
     * @param {datetime} since
     * @param {int} limit
     * @returns {[BaseExchangeTrade]}
     */
    async fetchTrades(symbol, since = undefined, limit = undefined) {
        throw new Error("Not implemented");
    }

    /**
     * 
     * @param {string|undefined} symbol 
     * @param {number|undefined} since 
     * @param {number|undefined} limit 
     * @returns 
     */
    async fetchTransactions(symbol = undefined, since = undefined, limit = undefined) {
        throw new Error("Not implemented");
    }

    /** @inheritdoc */
    async fetchWithdrawals(symbol = undefined, since = undefined, limit = undefined) {
        throw new Error("Not implemented");
    }

    /**
     * @returns {ExchangeOptions}
     */
    getExchangeParams() {
        return this.params;
    }

    /**
     * @returns {string}
     */
    getId() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {boolean} reload 
     * @returns 
     */
    async getMarkets() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     */
    getInternalMarketsInfo() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     */
    getWalletNames() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string} method 
     */
    has(method) {
        throw new Error("NOT IMPLEMENTED");
    }
    
    /** @inheritdoc */
    initMarketsFrom(exchange) {
        throw new Error("NOT IMPLEMENTED");
    }

    /** @inheritdoc */
    initMarkets(markets) {
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
     * 
     */
    mainWalletAccountType() {
        throw new Error("NOT IMPLEMENTED");
    }
    
    /**
     * Get market info
     * 
     * @param {string} symbol 
     * @returns {ccxt.Market}
     */
    market(symbol) {
        throw new Error("Not implemented")
    }

    /**
     * @returns {ccxt.Market}
     */
    get markets() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string} symbol 
     * @param {float} price 
     * @returns {float}
     */
    priceToPrecision(symbol, price) {
        throw new Error("Not implemented")
    }

    /**
     * 
     * @param {string} symbol 
     * @param {float} price 
     * @returns {float}
     */
    priceToPrecision2(symbol, price) {
        throw new Error("Not implemented")
    }
    
    /**
     * 
     */
    get symbols() {
        throw new Error("Not implemented")
    }
    

    /**
     * 
     * @param {string} code 
     * @param {float} amount 
     * @param {string} fromAccount 
     * @param {string} toAccount 
     */
    async transfer(code, amount, fromAccount, toAccount) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Watch Balance
     * 
     * @param {string|undefined} accountType
     */
    async watchBalance(accountType = undefined) {
        throw new Error("Not IMPLEMENTED");
    }

    /**
     * Watch my orders
     * @param {string|undefined} symbol 
     * @returns {[BaseExchangeOrder]}
     */
    async watchMyOrders(symbol = undefined){
        throw new Error("NOT IMPLEMENTED");
    }
    
    /**
     * Watch my trades
     * @param {string|undefined} symbol 
     * @returns {[BaseExchangeTrade]}
     */
    async watchMyTrades(symbol = undefined){
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