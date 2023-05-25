const {exchangeInstance} = require('../crypto/exchanges/exchanges');
const models = require('../../models/');

/** @typedef {import('../crypto/exchanges/BaseExchange').BaseExchange} BaseExchange */
/** @typedef {import('../crypto/exchanges/BaseExchange').ExchangeOptions} ExchangeOptions */


/**
 * 
 * @param {string} exchangeId 
 * @param {string} accountTypeId 
 * @param {boolean} paper 
 * @returns {any}
 */
const getExchangeMarkets = async function(exchangeId, accountTypeId, paper) {
    const exchangeMarket = await models.ExchangeMarket.findOne({
        where: {
            '$exchange.exchange_name$': exchangeId,
            '$account_type.account_type$': accountTypeId,
            paper: paper
        },
        include: [
            models.ExchangeMarket.AccountType,
            models.ExchangeMarket.Exchange
        ]
    });
    
    if (exchangeMarket == null) {
        throw new Error(`Exchange not found in database ${exchangeId} ${accountTypeId} paper:${paper}`);
    }

    let exchangeName = exchangeMarket.exchange.exchange_name;
    if (exchangeMarket.markets == null ||
        exchangeMarket.markets_updated_at == null ||
        ((new Date().getTime() - exchangeMarket.markets_updated_at.getTime()) > 3600 * 1000)) {
        
        try {
            let exchange = exchangeInstance(exchangeName, {
                paper: paper,
                exchangeType: accountTypeId,
            });

            let markets = await exchange.loadMarkets();
            exchangeMarket.markets = markets;
            exchangeMarket.markets_updated_at = models.Sequelize.fn('NOW');
            await exchangeMarket.save();
            return markets;
        } catch (ex) {
            console.error(ex);
            if (exchangeMarket.markets != null) {
                return exchangeMarket.markets;
            }
            throw new Error("Could not get markets:" + ex.getMessage());
        }

    } else {
        return exchangeMarket.markets;
    }
}

/**
 * 
 * @param {BaseExchange} exchange 
 */
const initializeExchangeMarkets = async function(exchange) {
    let props = exchange.getExchangeParams();
    let markets = await getExchangeMarkets(
        exchange.getId(), 
        props.exchangeType,
        props.paper);

    exchange.initMarkets(markets);
}

/**
 * 
 * @param {string} id 
 * @param {ExchangeOptions} options 
 * @returns {BaseExchange}
 */
const exchangeInstanceWithMarkets = async function(id, options) {
    const exchange = exchangeInstance(id, options);
    await initializeExchangeMarkets(exchange);
    return exchange;
}

module.exports = {
    initializeExchangeMarkets,
    getExchangeMarkets,
    exchangeInstanceWithMarkets,
}
