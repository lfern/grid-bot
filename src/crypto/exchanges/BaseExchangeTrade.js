class BaseExchangeTrade {
    /**
     * Trade amount
     * @returns {number}
     */
    get amount() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Trade cost
     * @returns {number}
     */
    get cost() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Datetime
     * @returns {string}
     */
    get datetime() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Fee cost
     * @returns {number}
     */
    get feeCost() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Fee currency
     * @returns {string}
     */
    get feeCurrency() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Trade id
     * @returns {number}
     */
    get id() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order id
     * @returns {string}
     */
    get order() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Trade price 
     * @returns {number}
     */
    get price() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Trade side
     * @returns {string}
     */
    get side() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Trade symbol
     * @returns {string}
     */
    get symbol() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Timestamp
     * @returns {number}
     */
    get takerOrMaker() {
        throw new Error("NOT IMPLEMENTED");
    }


    /**
     * Timestamp
     * @returns {number}
     */
    get timestamp() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Account
     * @returns {string}
     */
    get account() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Wallet
     * @returns {string}
     */
    get wallet() {
        throw new Error("NOT IMPLEMENTED");
    }
    
    /**
     * @param {Number} d
     */
    set amount(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @param {Number} d
     */
    set cost(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @param {String} d
     */
    set datetime(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @param {Number} d
     */
    set feeCost(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @param {String} d
     */
    set feeCurrency(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @param {String} d
     */
    set id(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @param {String} d
     */
    set order(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @param {Number} d
     */
    set price(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @param {String} d
     */
    set side(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @param {String} d
     */
    set symbol(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @param {String} d
     */
    set takerOrMaker(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @param {Number} d
     */
    set timestamp(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @param {String} d
     */
    set account(d) {
        throw new Error("NOT IMPLEMENTED");
    }

    /** @inheritdoc */
    set wallet(d) {
        throw new Error("NOT IMPLEMENTED");
    }
    

    /**
     * @returns {object}
     */
     toJson() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @returns {BaseExchangeOrder}
     */
    static fromJson(json) {
       throw new Error("NOT IMPLEMENTED");
    }
    
}

module.exports = { BaseExchangeTrade}