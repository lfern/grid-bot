const exc = require('../../crypto/exchanges/exceptions/ExchangeError');
const { BaseExchangeSync } = require('./BaseExchangeSync');

/** @typedef {import('./BaseExchangeSync').BaseExchange} BaseExchange */
const exchanges = {
    'bitfinex2': require('./BitfinexSync').BitfinexSync,
    'bitmex': require('./BitmexSync').BitmexSync,
    'deribit': require('./DeribitSync').DeribitSync,
}

/**
 * 
 * @param {BaseExchange} exchange
 * @param {ExchangeSyncOptions} options 
 * @returns {BaseExchangeSync}
 */
function exchangeSyncInstance(exchange) {
    if (!exchanges.hasOwnProperty(exchange.getId())) {
        throw new exc.ExchangeNotFoundError("Id not found for exchange: " + exchange.getId());
    }

    return new exchanges[exchange.getId()](exchange);
}

module.exports = { exchangeSyncInstance }