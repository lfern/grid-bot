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
const getExchangeInternalMarketsInfo = async function(exchangeId, accountTypeId, paper) {
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

            await exchange.loadMarkets();
            let markets = exchange.getInternalMarketsInfo();
            exchangeMarket.markets = markets;
            exchangeMarket.markets_updated_at = models.Sequelize.fn('NOW');
            await exchangeMarket.save();
            return markets;
        } catch (ex) {
            console.error("Error:", ex);
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
    let markets = await getExchangeInternalMarketsInfo(
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

/**
 * 
 * @param {Object} account 
 * @returns {BaseExchange}
 */
const exchangeInstanceFromAccount = async function(account, withMarkets = true) {
    let exchange = account.exchange;
    let account_type = account.account_type;
    if (!exchange || !account_type) {
        let freshAccount = await models.Account.findOne({
            where: {id: account.id},
            include: [models.Account.AccountType, models.Account.Exchange]
        });

        if (freshAccount == null) {
            throw new Error(`Account Id not found creating exchange object: ${account.id}`)
        }

        account_type = freshAccount.account_type;
        exchange = freshAccount.exchange;
    }

    if (withMarkets) {
        return await exchangeInstanceWithMarkets(exchange.exchange_name, {
            exchangeType: account_type.account_type,
            paper: account.paper,
            rateLimit: 1000,  // testing 1 second though it is not recommended (I think we should not send too many requests/second)
            apiKey: account.api_key,
            secret: account.api_secret,
        });
    } else {
        return exchangeInstance(exchange.exchange_name, {
            exchangeType: account_type.account_type,
            paper: account.paper,
            rateLimit: 1000,  // testing 1 second though it is not recommended (I think we should not send too many requests/second)
            apiKey: account.api_key,
            secret: account.api_secret,
        });
    }
}

/**
 * 
 * @param {Object} account 
 * @returns {BaseExchange}
 */
const exchangeInstanceWithMarketsFromAccount = async function(account) {
    return await exchangeInstanceFromAccount(account, true);
}

module.exports = {
    initializeExchangeMarkets,
    exchangeInstanceWithMarkets,
    exchangeInstanceWithMarketsFromAccount,
    exchangeInstanceFromAccount
}
