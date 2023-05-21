const {BaseExchangeCcxt} = require("./BaseExchangeCcxt");

/** @typedef {import('../BaseExchange').ExchangeOptions} ExchangeOptions */

class Bitfinex extends BaseExchangeCcxt {
    /**
     * 
     * @param {ExchangeOptions} params 
     */
    constructor(params = {}) {
        super('bitfinex2', params);
    }

}

module.exports = { Bitfinex }