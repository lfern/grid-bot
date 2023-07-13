const { OrderNotFound } = require("ccxt");
const {BaseExchangeCcxt} = require("./BaseExchangeCcxt");
const { BaseExchangeCcxtOrder } = require("./BaseExchangeCcxtOrder");
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
    async createOrder(symbol, type, side, amount, price = undefined, options = {}) {
        return new BaseExchangeCcxtOrder(
            await this.ccxtExchange.createOrder(
                symbol,
                type,
                side,
                amount,
                price,
                {
                    lev: this.params.exchangeType != 'spot' ? options.leverage : undefined, 
                }
            )
        );
    }

     /** @inheritdoc */
     get currencies() {
        let keys = Object.keys(this.ccxtExchange.currencies);;
        if (this.params.paper) {
            return keys.filter(x => x.startsWith('TEST'));
        } else {
            return keys.filter(x => !x.startsWith('TEST'));
        }
    }

    /** @inheritdoc */
    currencyNotFoundForMarket(symbol, side) {
        let market = this.ccxtExchange.market(symbol);
        return side == 'buy' ? market.quote : market.base;
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
    async fetchBalanceDepositWallet() {
        return await this.ccxtExchange.fetchBalance({type: 'exchange'});
    }

    /** @inheritdoc */
    async fetchOrder(id, symbol = undefined) {
        try {
            return new BaseExchangeCcxtOrder(
                await this.ccxtExchange.fetchOpenOrder(id, symbol)
            );
        } catch (ex) {
            if (ex instanceof OrderNotFound) {
                return new BaseExchangeCcxtOrder(
                    await this.ccxtExchange.fetchClosedOrder(id, symbol)
                );
            }
            throw ex;
        }
    }
    
    /** @inheritdoc */
    async fetchPositions(symbols = undefined) {
        let positions = await this.ccxtExchange.fetchPositions(symbols);
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
        return ['spot', 'funding', 'future', 'margin'];
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
    async transfer(code, amount, fromAccount, toAccount) {
        let params = {};
        if (fromAccount == 'future' || toAccount == 'future') {
            //let derivCode = code == 'USDT' ? 'USDTF0' : (code == 'TESTUSDT' ? 'TESTUSDTF0': code);
            if (fromAccount == 'future') {
                //params.currency_to = code;
                //params.currency = derivCode;
                fromAccount = 'derivatives';
            } else {
                //params.currency_to = derivCode;
                toAccount = 'derivatives';
            }
        }
        
        return await this.ccxtExchange.transfer(code, amount, fromAccount, toAccount, params);
    }

    /** @inheritdoc */
    async watchBalance(accountType = undefined) {
        accountType = accountType != undefined ? accountType : this.params.exchangeType;
        return await this.ccxtExchange.watchBalance({wallet: accountType == 'spot' ? 'exchange':'margin'});
    }
}

module.exports = { Bitfinex }