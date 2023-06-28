const {BaseExchangeCcxt} = require("./BaseExchangeCcxt");
const { BaseExchangeCcxtOrder } = require("./BaseExchangeCcxtOrder");
const {TRUNCATE, ArgumentsRequired} = require('ccxt');

const marketsFilter = {
    "spot": ([k, v]) => v.spot,
    "future": ([k, v]) => v.future || v.swap,
};
/**
 * Bitmex ccxt wrapper
 */
class Bitmex extends BaseExchangeCcxt {
    /**
     * Bitmex wrapper constructor
     * 
     * @param {ExchangeOptions} params initialization params
     */
    constructor(params = {}) {
        super('bitmex', params);

        if (this.params.paper) {
            this.ccxtExchange.urls['api'] = this.ccxtExchange.urls['test'];
        }
    }

    /** @inheritdoc */
    amountToPrecision2(symbol, amount) {
        try {
            let newAmount;
            if (amount < 0) {
                newAmount = -this.ccxtExchange.amountToPrecision(symbol, -amount);
            } else {
                newAmount = this.ccxtExchange.amountToPrecision(symbol, amount);
            }

            symbol = this.ccxtExchange.safeSymbol(symbol);
            const market = this.ccxtExchange.market(symbol);
            const oldPrecision = this.ccxtExchange.safeValue(this.ccxtExchange.options, 'oldPrecision');
            if (market['spot'] && !oldPrecision) {
                newAmount = this.ccxtExchange.convertToRealAmount(market['base'], newAmount);
            }

            return newAmount;
        } catch (ex) {
            if (ex instanceof ArgumentsRequired) {
                return 0;
            }
            throw ex;
        }
    }


    /** @inheritdoc */
    async createOrder(symbol, type, side, amount, price = undefined, options = {}) {

        await this.loadMarkets();
        let market = this.ccxtExchange.market(symbol);

        // setting leverage on symbol before sending order
        if (options.leverage && !market['spot']) {
            await this.ccxtExchange.private_post_position_leverage({
                "symbol": market['id'],
                "leverage": options.leverage.toString()
            });
        }

        // send order to exchange
        return new BaseExchangeCcxtOrder(
            await this.ccxtExchange.createOrder(
                symbol,
                type,
                side,
                amount,
                price
            )
        );
    }

    /** @inheritdoc */
    currencyNotFoundForMarket(symbol, side) {
        let market = this.ccxtExchange.market(symbol);
        // TODO: check inverse markets
        return side == 'buy' ? market.quote : market.base;
    }

    /** @inheritdoc */
    async getMarkets() {
        let markets = await super.getMarkets();
        let filter = marketsFilter[this.params.exchangeType];
        if (filter == null) {
            filter = ([k, v]) => false;
        }

        return Object.fromEntries(Object.entries(markets).filter(filter));
    }

    /** @inheritdoc */
    getThrottlerHash(exchangeType, paper) {
        return this.ccxtExchange.id +"-"+ (paper?'paper':'real');
    }

    /** @inheritdoc */
    getWalletNames() {
        return ['spot'];
    }

    /** @inheritdoc */
    get markets() {
        let filter = marketsFilter[this.params.exchangeType];
        if (filter == null) {
            filter = ([k, v]) => false;
        }

        return Object.fromEntries(Object.entries(this.ccxtExchange.markets).filter(filter));
    }

    /** @inheritdoc */
    async transfer(code, amount, fromAccount, toAccount) {
        throw new Error("NOT IMPLEMENTED");
    }
}

module.exports = {Bitmex}