const {BaseExchangeCcxt} = require("./BaseExchangeCcxt");
const {BaseExchangeCcxtPosition} = require("./BaseExchangeCcxtPosition");

/** @typedef {import('../BaseExchange').ExchangeOptions} ExchangeOptions */

const marketsFilter = {
    "paper" : {
        "spot": ([k, v]) => k.startsWith('TEST') && v.spot,
        "future": ([k, v]) => k.startsWith('TEST') && v.swap,
        "funding": ([k, v]) => false,
    },
    "real": {
        "spot": ([k, v]) => !k.startsWith('TEST') && v.spot,
        "future": ([k, v]) => !k.startsWith('TEST') && v.swap,
        "funding": ([k, v]) => false,
    }
};

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
        let filter = marketsFilter[this.params.paper?'paper':'real'][this.params.exchangeType];
        if (filter == null) {
            filter = ([k, v]) => false;
        }

        return Object.fromEntries(Object.entries(markets).filter(filter));
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
    getThrottlerHash(exchangeType, paper) {
        return this.ccxtExchange.id;
    }


    /** @inheritdoc */
    getWalletNames() {
        return ['spot', 'funding', 'future'];
    }

    /** @inheritdoc */
    get markets() {
        let filter = marketsFilter[this.params.paper?'paper':'real'][this.params.exchangeType];
        if (filter == null) {
            filter = ([k, v]) => false;
        }
        console.log("filtering");
        return Object.fromEntries(Object.entries(this.ccxtExchange.markets).filter(filter));
    }    

    /** @inheritdoc */
    async watchBalance(accountType = undefined) {
        accountType = accountType != undefined ? accountType : this.params.exchangeType;
        return await this.ccxtExchange.watchBalance({wallet: accountType == 'spot' ? 'exchange':'margin'});
    }
}

module.exports = { Bitfinex }