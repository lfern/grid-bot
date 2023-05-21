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

    /** @inheritdoc */
    async loadMarkets(reload = false) {
        let markets = await super.loadMarkets(reload);

        if (this.params.paper) {
            return Object.fromEntries(Object.entries(markets).filter(([k,v]) => k.startsWith('TEST')));
        } else {
            return Object.fromEntries(Object.entries(markets).filter(([k,v]) => !k.startsWith('TEST')));
        }
    }

}

module.exports = { Bitfinex }