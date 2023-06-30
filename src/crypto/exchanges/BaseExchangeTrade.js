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