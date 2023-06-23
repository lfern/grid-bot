
class BaseExchangeOrder {
    /**
     * Order amount
     * @returns {number}
     */
    get amount() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order average price
     * @returns {number}
     */
    get average() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order cost
     * @returns {number}
     */
    get cost() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order datetime
     * @returns {string}
     */
    get datetime() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order datetime creation
     * @returns {string}
     */
    get datetime_creation() {
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
     * Amount filled
     * @returns {number}
     */
    get filled() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order id
     * @returns {string}
     */
    get id() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order price
     * @returns {number}
     */
    get price() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order remaining amount
     * @returns {number}
     */
    get remaining() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order size
     * @returns {string}
     */
    get side() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order status
     * @returns {string}
     */
    get status() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order symbol
     * @returns {string}
     */
    get symbol() {
        throw new Error("NOT IMPLEMENTED");
    }
    

    /**
     * Order timestamp
     * @returns {number}
     */
    get timestamp() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order timestamp
     * @returns {number}
     */
    get timestamp_creation() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Trade list
     * @returns {BaseExchangeCcxtTrade[]}
     */
    get trades() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * Order type
     * @returns {string}
     */
    get type() {
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

module.exports = { BaseExchangeOrder }