const {BaseExchangeCcxt} = require("./BaseExchangeCcxt");
const {BaseExchangeCcxtPosition} = require("./BaseExchangeCcxtPosition");

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
    async getMarkets() {
        let markets = await super.getMarkets();

        if (this.params.paper) {
            return Object.fromEntries(Object.entries(markets).filter(([k,v]) => k.startsWith('TEST')));
        } else {
            return Object.fromEntries(Object.entries(markets).filter(([k,v]) => !k.startsWith('TEST')));
        }
    }

    /** @inheritdoc */
    async fetchBalance() {
        return await this.ccxtExchange.fetchBalance({type: this.params.exchangeType == 'spot' ? 'exchange':'margin'});
    }

    /** @inheritdoc */
    async fetchPositions(symbol = undefined) {
        let positions = await this.ccxtExchange.fetchPositions(symbol);
        let newPositions = [];
        positions.forEach(p => {
            newPositions.push(new BaseExchangeCcxtPosition({
                contracts: p[2],
                info: p
            }));
        })

        return newPositions;
    }

    /** @inheritdoc */
    async watchBalance() {
        return await this.ccxtExchange.watchBalance({wallet: this.params.exchangeType == 'spot' ? 'exchange':'margin'});
    }

}

module.exports = { Bitfinex }