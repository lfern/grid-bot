const exc = require('./exceptions/ExchangeError');

/** @typedef {import('./BaseExchange').ExchangeOptions} ExchangeOptions */
/** @typedef {import('./BaseExchange').BaseExchange} BaseExchange */

const exchanges = {
    'bitfinex2': require('./Bitfinex').Bitfinex,
}

/**
 * 
 * @param {string} id 
 * @param {ExchangeOptions} options 
 * @returns {BaseExchange}
 */
function exchangeInstance(id, options) {
    if (!exchanges.hasOwnProperty(id)) {
        throw new exc.ExchangeNotFoundError("Id not found for exchange: " + id);
    }

    return new exchanges[id](options);
}

module.exports = { exchangeInstance }