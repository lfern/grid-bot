
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
/** @typedef {import('../BaseExchange').ExtendedLedgerEntry} ExtendedLedgerEntry */

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
    amountToPrecision2(symbol, amount) {
        try {
            if (amount < 0) {
                return -this.ccxtExchange.amountToPrecision(symbol, -amount);
            } else {
                return this.ccxtExchange.amountToPrecision(symbol, amount);
            }
        } catch (ex) {
            if (ex instanceof ccxt.ArgumentsRequired) {
                return 0;
            }
            throw ex;
        }

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
    costToPrecision(symbol, price) {
        try {
            return this.ccxtExchange.costToPrecision(symbol, price);

        } catch (ex) {
            if (ex instanceof ccxt.ArgumentsRequired) {
                return 0;
            }
            throw ex;
        }
    }

    /** @inheritdoc */
    async createOrder(symbol, type, side, amount, price = undefined, options = {}) {
        return new BaseExchangeCcxtOrder(
            await this.ccxtExchange.createOrder(
                symbol,
                type,
                side,
                amount,
                price,
                options
            )
        );
    }

    /** @inheritdoc */
    get currencies() {
        return Object.keys(this.ccxtExchange.currencies);
    }

    /** @inheritdoc */
    async fetchBalance() {
        return await this.ccxtExchange.fetchBalance();
    }

    /** @inheritdoc */
    async fetchBalanceDepositWallet() {
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

    /** @inheritdoc  */
    async fetchClosedOrders(symbol = undefined, since = undefined, limit = undefined) {
        let orders = await this.ccxtExchange.fetchClosedOrder(symbol, since, limit);
        let newOrders = [];
        orders.forEach(o => {
            newOrders.push(new BaseExchangeCcxtOrder(o));
        })

        return newOrders;
    }

    /** @inheritdoc */
    async fetchDeposits(symbol = undefined, since = undefined, limit = undefined) {
        return await this.ccxtExchange.fetchDeposits(symbol, since, limit);
    }

    /** @inheritdoc */
    async fetchLedger(code = undefined, since = undefined, limit = undefined, params = {}) {
        return await this.ccxtExchange.fetchLedger(code, since, limit, params)   
    }

     /** @inheritdoc */
     async fetchExtendedLedger(code = undefined, since = undefined, limit = undefined, params = {}) {
        let newLedger = [];
        let ledger = await this.fetchLedger(code, since, limit, params);
        for(let i=0;i<ledger.length;i++) {
            let entry = ledger[i];
            /** @type {ExtendedLedgerEntry} */
            let newEntry = {
                account: entry.account,
                after: entry.after,
                amount: entry.amount,
                before: entry.before,
                currency: entry.currency,
                datetime: entry.datetime,
                direction: entry.direction,
                fee: entry.fee ? {
                    cost: entry.fee.cost,
                    currency: entry.fee.currency
                } : undefined,
                id: entry.id,
                info: entry.info,
                newFAmountNoChange: entry.amount,
                newFDescription: undefined,
                newFHolder: undefined,
                newFSymbol: undefined,
                newFStatus: entry.status,
                newFOrderId: undefined,
                newFSubtype: undefined,
                newFType: undefined,
                newFWallet: undefined,
                newFOtherData: undefined,
                referenceAccount: entry.referenceAccount,
                referenceId: entry.referenceId,
                status: entry.status,
                timestamp: entry.timestamp,
                type: entry.type,
            };

            newEntry = this.parseExtendedLedgerEntry(newEntry);
            newLedger.push(newEntry)
        }
        
        return newLedger;
    }

    /** @inheritdoc */
    async fetchMyTrades(symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let trades = await this.ccxtExchange.fetchMyTrades(symbol, since, limit, params);
        let newTrades = [];
        trades.forEach(o => {
            o = this.parseExtendedTrade(o);
            newTrades.push(new BaseExchangeCcxtTrade(o));
        })

        return newTrades;
    }

    /** @inheritdoc */
    async fetchOpenOrder(id, symbol = undefined) {
        return new BaseExchangeCcxtOrder(
            await this.ccxtExchange.fetchOpenOrder(id, symbol)
        );
    }

    /** @inheritdoc */
    async fetchOpenOrders(symbol = undefined, since = undefined, limit = undefined) {
        let orders = await this.ccxtExchange.fetchOpenOrders(symbol, since, limit);
        let newOrders = [];
        orders.forEach(o => {
            newOrders.push(new BaseExchangeCcxtOrder(o));
        })

        return newOrders;
    }

    /** @inheritdoc */
    async fetchOrder(id, symbol = undefined) {
        return new BaseExchangeCcxtOrder(
            await this.ccxtExchange.fetchOrder(id, symbol)
        );
    }

    /** @inheritdoc */
    async fetchOrders(symbol = undefined, since = undefined, limit = undefined) {
        let orders = await this.ccxtExchange.fetchOrders(symbol, since, limit);
        let newOrders = [];
        orders.forEach(o => {
            newOrders.push(new BaseExchangeCcxtOrder(o));
        })

        return newOrders;
    }

    /** @inheritdoc */
    async fetchOrderTrades(id, symbol) {
        let trades = await this.ccxtExchange.fetchOrderTrades(id, symbol);
        let newTrades = [];
        trades.forEach(t => {
            o = this.parseExtendedTrade(o);
            newTrades.push(new BaseExchangeCcxtTrade(t));
        })

        return newTrades;
    }

    /** @inheritdoc */
    async fetchPositions(symbols = undefined) {
        let positions = await this.ccxtExchange.fetchPositions(symbols);
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
            o = this.parseExtendedTrade(o);
            newTrades.push(new BaseExchangeCcxtTrade(t));
        })

        return newTrades;
    }

    /** @inheritdoc */
    async fetchTransactions(symbol = undefined, since = undefined, limit = undefined) {
        return await this.ccxtExchange.fetchTransactions(symbol, since, limit);
    }

    /** @inheritdoc */
    async fetchWithdrawals(symbol = undefined, since = undefined, limit = undefined) {
        return await this.ccxtExchange.fetchWithdrawals(symbol, since, limit);
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
    has(method) {
        // TODO: improve this!!
        return (method in this.ccxtExchange.has) && this.ccxtExchange.hash[method];
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
        console.log("Not filtering")
        return this.ccxtExchange.markets;
    }

    /** @inheritdoc */
    get markets_by_id() {
        return this.ccxtExchange.markets_by_id;
    }
    
    /**
     * 
     * @param {ExtendedLedgerEntry} entry 
     */
    parseExtendedLedgerEntry(entry) {
        return entry;
    }

    /**
     * 
     * @param {ccxt.Trade} entry 
     */
    parseExtendedTrade(entry) {
        entry.account = undefined;
        return entry;
    }
    
    /** @inheritdoc */
    priceToPrecision(symbol, price) {
        return this.ccxtExchange.priceToPrecision(symbol, price);
    }

    /** @inheritdoc */
    priceToPrecision2(symbol, price) {
        try {
            return this.ccxtExchange.priceToPrecision(symbol, price);
        } catch (ex) {
            if (ex instanceof ccxt.ArgumentsRequired) {
                return 0;
            }
            throw ex;
        }

    }

    /** @inheritdoc */
    get symbols() {
        return Object.keys(this.markets);
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
            o = this.parseExtendedTrade(o);
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