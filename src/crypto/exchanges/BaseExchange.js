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
 * @typedef {Object} ExtendedLedgerEntryFee
 * @property {number} cost
 * @property {string} currency
 */
/**
 * @typedef {Object} ExtendedLedgerEntry
 * @property {string} id
 * @property {Object|undefined} info
 * @property {int|undefined} timestamp
 * @property {string|undefined} datetime
 * @property {string|undefined} direction
 * @property {string|undefined} account
 * @property {string|undefined} referenceId
 * @property {string|undefined} referenceAccount
 * @property {string|undefined} type
 * @property {string|undefined} currency
 * @property {number|undefined} amount
 * @property {number|undefined} before
 * @property {number|undefined} after
 * @property {string|undefined} status
 * @property {ExtendedLedgerEntryFee|undefined} fee
 * @property {string} newFType
 * @property {string} newFSubtype
 * @property {string} newFWallet
 * @property {string} newFDescription
 * @property {string} newFOrderId
 * @property {string} newFSymbol
 * @property {number|undefined} newFAmountChange
 * @property {string} newFHolder
 * @property {any} newFOtherData
 */

/**
 * CreateOrderOptions
 * @typedef {Object} CreateOrderOptions
 * @property {number|undefined} leverage 
 */

/**
 * UserInfo
 * @typedef {Object} UserInfo
 * @property {string} id
 * @property {string} holder
 * @property {string} email
 * @property {string} name
 * @property {any} info
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
     */
    getExchangeName() {
        throw new Error("Not implemented")
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
     * @returns {BaseExchangeOrder}
     */
    async fetchClosedOrders(symbol = undefined, since = undefined, limit = undefined) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string|undefined} code 
     * @param {int|undefined} since 
     * @param {int|undefined} limit 
     * @param {{}} params
     */
    async fetchLedger(code = undefined, since = undefined, limit = undefined, params = {}) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string|undefined} code 
     * @param {int|undefined} since 
     * @param {int|undefined} limit 
     * @param {{}} params
     * @return {[ExtendedLedgerEntry]}
     */
    async fetchExtendedLedger(code = undefined, since = undefined, limit = undefined, params = {}) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * 
     * @param {string|undefined} symbol 
     * @param {int|undefined} since 
     * @param {int|undefined} limit 
     * @param {{}} params
     * @return {[BaseExchangeTrade]}
     */
    async fetchExtendedMyTrades(symbol = undefined, since = undefined, limit = undefined, params = {}) {
        throw new Error("NOT IMPLEMENTED");
    }    
    
    /**
     * 
     * @param {string|undefined} symbol 
     * @param {int|undefined} since 
     * @param {int|undefined} limit 
     * @param {{}} params
     * @return {[BaseExchangeTrade]}
     */
    async fetchMyTrades(symbol = undefined, since = undefined, limit = undefined, params = {}) {
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
     * @returns {UserInfo}
     */
    async userInfo() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @returns {[UserInfo]}
     */
    async userInfoAccounts() {
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

const LEDGER_TRADE_TYPE = "Trade";
const LEDGER_FEE_TYPE = "Fee";
const LEDGER_DEPOSIT_TYPE = "Deposit";
const LEDGER_WITHDRAWAL_TYPE = "Withdrawal";
const LEDGER_TRANSFER_TYPE = "Transfer";
const LEDGER_SETTLEMENT_TYPE = "Settlement";
const LEDGER_OTHER_CREDIT_TYPE = "OtherCredit";
const LEDGER_OTHER_DEBIT_TYPE = "OtherDebit";

// trade subtypes
const LEDGER_SPOT_TRADE_SUBTYPE = "SpotTrade";
const LEDGER_DERIVATIVE_TRADE_SUBTYPE = "DerivativeTrade";
// Fee subtypes
const LEDGER_TRADING_FEE_SUBTYPE = "TradingFee";
const LEDGER_FUNDING_FEE_SUBTYPE = "FundingFee";
const LEDGER_WITHDRAWAL_FEE_SUBTYPE = "WithdrawalFee";
const LEDGER_CANCELED_WITHDRAWAL_FEE_SUBTYPE = "CanceledWithdrawalFee";
const LEDGER_DEPOSIT_FEE_SUBTYPE = "DepositFee";
const LEDGER_OTHER_FEE_SUBTYPE = "OtherFee";
// Deposit subtypes
const LEDGER_DEPOSIT_SUBTYPE = "Deposit";
// Withdrawal subtypes
const LEDGER_WITHDRAWAL_SUBTYPE = "Withdrawal";
const LEDGER_CANCELLED_WITHDRAWAL_SUBTYPE = "CanceledWithdrawal";
// Transfer Subtypes
const LEDGER_WALLET_TRANSFER_SUBTYPE = "WalletTransfer";
const LEDGER_SUBACCOUNT_TRANSFER_SUBTYPE = "SubaccountTransfer";
// Settlement subtypes
const LEDGER_SETTLEMENT_SUBTYPE = "Settlement";
// Other credit subtypes
const LEDGER_OTHER_CREDIT_SUBTYPE = "OtherCredit";
// Other debit subtypes
const LEDGER_OTHER_DEBIT_SUBTYPE = "OtherDebit"


module.exports = { 
    BaseExchange,
    LedgerTypes: {
        LEDGER_TRADE_TYPE,
        LEDGER_FEE_TYPE,
        LEDGER_DEPOSIT_TYPE,
        LEDGER_WITHDRAWAL_TYPE,
        LEDGER_TRANSFER_TYPE,
        LEDGER_SETTLEMENT_TYPE,
        LEDGER_OTHER_CREDIT_TYPE,
        LEDGER_OTHER_DEBIT_TYPE,

        LEDGER_WALLET_TRANSFER_SUBTYPE,
        LEDGER_SUBACCOUNT_TRANSFER_SUBTYPE,
        LEDGER_CANCELLED_WITHDRAWAL_SUBTYPE,
        LEDGER_SPOT_TRADE_SUBTYPE,
        LEDGER_DERIVATIVE_TRADE_SUBTYPE,
        LEDGER_TRADING_FEE_SUBTYPE,
        LEDGER_FUNDING_FEE_SUBTYPE,
        LEDGER_WITHDRAWAL_FEE_SUBTYPE,
        LEDGER_CANCELED_WITHDRAWAL_FEE_SUBTYPE,
        LEDGER_DEPOSIT_FEE_SUBTYPE,
        LEDGER_OTHER_FEE_SUBTYPE,
        LEDGER_DEPOSIT_SUBTYPE,
        LEDGER_WITHDRAWAL_SUBTYPE,
        LEDGER_SETTLEMENT_SUBTYPE,
        LEDGER_OTHER_CREDIT_SUBTYPE,
        LEDGER_OTHER_DEBIT_SUBTYPE,

    }
};