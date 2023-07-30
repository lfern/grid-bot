const { AccountSyncRepository } = require("../../../repository/AccountSyncRepository");

/** @typedef {import("../../crypto/exchanges/exchanges").BaseExchange} BaseExchange */
/**
 * @typedef {Object} ExchangeSyncEndpoint
 * @property {string} endpoint
 * @property {int} lastTs
 */

/**
 * @typedef {Object} ExchangeSyncOptions
 * @property {[ExchangeSyncEndpoint]} endpoints 
 */

class BaseExchangeSync {
    /**
     * 
     * @param {BaseExchange} exchange
     */
    constructor(exchange) {
        this.exchange = exchange;
        this.repository = new AccountSyncRepository();

    }

    async sync(accountId) {
        throw new Error("NOT IMPLEMENTED");
    }
}

module.exports = {
    BaseExchangeSync
}