const ccxt = require('ccxt');

class bitfinex2 extends ccxt.pro.bitfinex2 {
    async watchOrders(symbol = undefined, since = undefined, limit = undefined, params = {}) {
        /**
         * @method
         * @name bitfinex2#watchOrders
         * @description watches information on multiple orders made by the user
         * @param {string} symbol unified market symbol of the market orders were made in
         * @param {int|undefined} since the earliest time in ms to fetch orders for
         * @param {int|undefined} limit the maximum number of  orde structures to retrieve
         * @param {object} params extra parameters specific to the bitfinex2 api endpoint
         * @returns {[object]} a list of [order structures]{@link https://docs.ccxt.com/#/?id=order-structure
         */
        await this.loadMarkets();
        let messageHash = 'orders';
        if (symbol !== undefined) {
            const market = this.market(symbol);
            messageHash += ':' + market['id'];
        }

        const orders = await this.subscribePrivate(messageHash);
        if (this.newUpdates) {
            limit = orders.getLimit(symbol, limit);
        }
        
        // let ors = this.filterBySymbolSinceLimit(orders, symbol, since, limit);
        return this.filterByValueSinceLimit(orders, 'symbol', symbol, since, limit, 'timestamp_update');
    }

    parseWsOrder(order, market = undefined) {
        let parsedOrder = super.parseWsOrder(order, market);
        const timestamp = this.safeInteger(order, 5);
        parsedOrder['timestamp_update'] = timestamp;
        parsedOrder['datetime_update'] = this.iso8601(timestamp);
        return parsedOrder;
    }
}

module.exports = {bitfinex2}