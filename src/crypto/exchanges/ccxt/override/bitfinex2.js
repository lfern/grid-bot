const ccxt = require('ccxt');
const Precise = ccxt.Precise;

class bitfinex2 extends ccxt.pro.bitfinex2 {
    constructor(userConfig = {}) {
        super(userConfig);
        this.options['exchangeTypes'] = {
            'MARKET': 'market',
            'EXCHANGE MARKET': 'market',
            'LIMIT': 'limit',
            'EXCHANGE LIMIT': 'limit',
            'STOP': 'stop',
            'EXCHANGE STOP': 'market',
            // 'TRAILING STOP': undefined,
            // 'EXCHANGE TRAILING STOP': undefined,
            'FOK': 'limit',
            'EXCHANGE FOK': 'limit',
            'STOP LIMIT': 'limit',
            'EXCHANGE STOP LIMIT': 'limit',
            'IOC': 'limit',
            'EXCHANGE IOC': 'limit',
        };
    }

//    async watchOrders(symbol = undefined, since = undefined, limit = undefined, params = {}) {
//        /**
//         * @method
//         * @name bitfinex2#watchOrders
//         * @description watches information on multiple orders made by the user
//         * @param {string} symbol unified market symbol of the market orders were made in
//         * @param {int|undefined} since the earliest time in ms to fetch orders for
//         * @param {int|undefined} limit the maximum number of  orde structures to retrieve
//         * @param {object} params extra parameters specific to the bitfinex2 api endpoint
//         * @returns {[object]} a list of [order structures]{@link https://docs.ccxt.com/#/?id=order-structure
//         */
//        await this.loadMarkets();
//        let messageHash = 'orders';
//        if (symbol !== undefined) {
//            const market = this.market(symbol);
//            messageHash += ':' + market['id'];
//        }
//
//        const orders = await this.subscribePrivate(messageHash);
//        if (this.newUpdates) {
//            limit = orders.getLimit(symbol, limit);
//        }
//        
//        // let ors = this.filterBySymbolSinceLimit(orders, symbol, since, limit);
//        return this.filterByValueSinceLimit(orders, 'symbol', symbol, since, limit, 'timestamp_update');
//    }

    parseOrder(order, market = undefined) {
        let parsedOrder = super.parseOrder(order, market);
        const timestamp = this.safeInteger(order, 4);
        parsedOrder['datetime_creation'] = timestamp;
        parsedOrder['datetime_creation'] = this.iso8601(timestamp);
        return parsedOrder;
    }

    parseWsOrder(order, market = undefined) {
        let parsedOrder = super.parseWsOrder(order, market);
        const timestamp = this.safeInteger(order, 4);
        parsedOrder['datetime_creation'] = timestamp;
        parsedOrder['datetime_creation'] = this.iso8601(timestamp);
        return parsedOrder;
    }
    
    async createOrder(symbol, type, side, amount, price = undefined, params = {}) {
        /**
         * @method
         * @name bitfinex2#createOrder
         * @description Create an order on the exchange
         * @param {string} symbol Unified CCXT market symbol
         * @param {string} type 'limit' or 'market'
         * @param {string} side 'buy' or 'sell'
         * @param {float} amount the amount of currency to trade
         * @param {float} price price of order
         * @param {object} params  Extra parameters specific to the exchange API endpoint
         * @param {float} params.stopPrice The price at which a trigger order is triggered at
         * @param {string} params.timeInForce "GTC", "IOC", "FOK", or "PO"
         * @param {bool} params.postOnly
         * @param {bool} params.reduceOnly Ensures that the executed order does not flip the opened position.
         * @param {int} params.flags additional order parameters: 4096 (Post Only), 1024 (Reduce Only), 16384 (OCO), 64 (Hidden), 512 (Close), 524288 (No Var Rates)
         * @param {int} params.lev leverage for a derivative order, supported by derivative symbol orders only. The value should be between 1 and 100 inclusive.
         * @param {string} params.price_traling The trailing price for a trailing stop order
         * @param {string} params.price_aux_limit Order price for stop limit orders
         * @param {string} params.price_oco_stop OCO stop price
         * @returns {object} an [order structure]{@link https://docs.ccxt.com/#/?id=order-structure}
         */
        await this.loadMarkets();
        const market = this.market(symbol);
        // order types "limit" and "market" immediatley parsed "EXCHANGE LIMIT" and "EXCHANGE MARKET"
        // note: same order types exist for margin orders without the EXCHANGE prefix
        const orderTypes = this.safeValue(this.options, 'orderTypes', {});
        let orderType = this.safeStringUpper(orderTypes, type, type);
        orderType = orderType.toUpperCase();
        const stopPrice = this.safeString2(params, 'stopPrice', 'triggerPrice');
        const timeInForce = this.safeString(params, 'timeInForce');
        const postOnlyParam = this.safeValue(params, 'postOnly', false);
        const reduceOnly = this.safeValue(params, 'reduceOnly', false);
        const clientOrderId = this.safeValue2(params, 'cid', 'clientOrderId');
        params = this.omit(params, ['triggerPrice', 'stopPrice', 'timeInForce', 'postOnly', 'reduceOnly', 'price_aux_limit']);
        let amountString = this.amountToPrecision(symbol, amount);
        amountString = (side === 'buy') ? amountString : Precise.stringNeg(amountString);
        const request = {
            // 'gid': 0123456789, // int32,  optional group id for the order
            // 'cid': 0123456789, // int32 client order id
            'type': orderType,
            'symbol': market['id'],
            // 'price': this.numberToString (price),
            'amount': amountString,
            // 'flags': 0, // int32, https://docs.bitfinex.com/v2/docs/flag-values
            // 'lev': 10, // leverage for a derivative orders, the value should be between 1 and 100 inclusive, optional, 10 by default
            // 'price_trailing': this.numberToString (priceTrailing),
            // 'price_aux_limit': this.numberToString (stopPrice),
            // 'price_oco_stop': this.numberToString (ocoStopPrice),
            // 'tif': '2020-01-01 10:45:23', // datetime for automatic order cancellation
            // 'meta': {
            //     'aff_code': 'AFF_CODE_HERE'
            // },
        };
        const stopLimit = ((orderType === 'EXCHANGE STOP LIMIT') || ((orderType === 'EXCHANGE LIMIT') && (stopPrice !== undefined)));
        const exchangeStop = (orderType === 'EXCHANGE STOP');
        const exchangeMarket = (orderType === 'EXCHANGE MARKET');
        const stopMarket = (exchangeStop || (exchangeMarket && (stopPrice !== undefined)));
        const ioc = ((orderType === 'EXCHANGE IOC') || (timeInForce === 'IOC'));
        const fok = ((orderType === 'EXCHANGE FOK') || (timeInForce === 'FOK'));
        const postOnly = (postOnlyParam || (timeInForce === 'PO'));
        if ((ioc || fok) && (price === undefined)) {
            throw new InvalidOrder(this.id + ' createOrder() requires a price argument with IOC and FOK orders');
        }
        if ((ioc || fok) && exchangeMarket) {
            throw new InvalidOrder(this.id + ' createOrder() does not allow market IOC and FOK orders');
        }
        if ((orderType !== 'EXCHANGE MARKET') && (!exchangeMarket) && (!exchangeStop)) {
            request['price'] = this.priceToPrecision(symbol, price);
        }
        if (stopLimit || stopMarket) {
            // request['price'] is taken as stopPrice for stop orders
            request['price'] = this.priceToPrecision(symbol, stopPrice);
            if (stopMarket) {
                request['type'] = 'EXCHANGE STOP';
            }
            else if (stopLimit) {
                request['type'] = 'EXCHANGE STOP LIMIT';
                request['price_aux_limit'] = this.priceToPrecision(symbol, price);
            }
        }
        if (ioc) {
            request['type'] = 'EXCHANGE IOC';
        }
        else if (fok) {
            request['type'] = 'EXCHANGE FOK';
        }
        // flag values may be summed to combine flags
        let flags = 0;
        if (postOnly) {
            flags = this.sum(flags, 4096);
        }
        if (reduceOnly) {
            flags = this.sum(flags, 1024);
        }
        if (flags !== 0) {
            request['flags'] = flags;
        }
        if (clientOrderId !== undefined) {
            request['cid'] = clientOrderId;
            params = this.omit(params, ['cid', 'clientOrderId']);
        }
        if (market['swap']) {
            const swapTypes = {
                'EXCHANGE MARKET': 'MARKET',
                'EXCHANGE LIMIT': 'LIMIT',
                'EXCHANGE STOP': 'STOP',
                'EXCHANGE FOK': 'FOK',
                'EXCHANGE STOP LIMIT': 'STOP LIMIT',
                'EXCHANGE IOC': 'IOC',
            };
            request['type'] = this.safeString(swapTypes, request['type'], request['type']);
        }
        const response = await this.privatePostAuthWOrderSubmit(this.extend(request, params));
        //
        //      [
        //          1653325121,   // Timestamp in milliseconds
        //          "on-req",     // Purpose of notification ('on-req', 'oc-req', 'uca', 'fon-req', 'foc-req')
        //          null,         // unique ID of the message
        //          null,
        //              [
        //                  [
        //                      95412102131,            // Order ID
        //                      null,                   // Group ID
        //                      1653325121798,          // Client Order ID
        //                      "tDOGE:UST",            // Market ID
        //                      1653325121798,          // Millisecond timestamp of creation
        //                      1653325121798,          // Millisecond timestamp of update
        //                      -10,                    // Amount (Positive means buy, negative means sell)
        //                      -10,                    // Original amount
        //                      "EXCHANGE LIMIT",       // Type of the order: LIMIT, EXCHANGE LIMIT, MARKET, EXCHANGE MARKET, STOP, EXCHANGE STOP, STOP LIMIT, EXCHANGE STOP LIMIT, TRAILING STOP, EXCHANGE TRAILING STOP, FOK, EXCHANGE FOK, IOC, EXCHANGE IOC.
        //                      null,                   // Previous order type (stop-limit orders are converted to limit orders so for them previous type is always STOP)
        //                      null,                   // Millisecond timestamp of Time-In-Force: automatic order cancellation
        //                      null,                   // _PLACEHOLDER
        //                      4096,                   // Flags, see parseOrderFlags()
        //                      "ACTIVE",               // Order Status, see parseOrderStatus()
        //                      null,                   // _PLACEHOLDER
        //                      null,                   // _PLACEHOLDER
        //                      0.071,                  // Price (Stop Price for stop-limit orders, Limit Price for limit orders)
        //                      0,                      // Average Price
        //                      0,                      // Trailing Price
        //                      0,                      // Auxiliary Limit price (for STOP LIMIT)
        //                      null,                   // _PLACEHOLDER
        //                      null,                   // _PLACEHOLDER
        //                      null,                   // _PLACEHOLDER
        //                      0,                      // Hidden (0 if false, 1 if true)
        //                      0,                      // Placed ID (If another order caused this order to be placed (OCO) this will be that other order's ID)
        //                      null,                   // _PLACEHOLDER
        //                      null,                   // _PLACEHOLDER
        //                      null,                   // _PLACEHOLDER
        //                      "API>BFX",              // Routing, indicates origin of action: BFX, ETHFX, API>BFX, API>ETHFX
        //                      null,                   // _PLACEHOLDER
        //                      null,                   // _PLACEHOLDER
        //                      {"$F7":1}               // additional meta information about the order ( $F7 = IS_POST_ONLY (0 if false, 1 if true), $F33 = Leverage (int))
        //                  ]
        //              ],
        //          null,      // CODE (work in progress)
        //          "SUCCESS",                    // Status of the request
        //          "Submitting 1 orders."      // Message
        //       ]
        //
        const status = this.safeString(response, 6);
        if (status !== 'SUCCESS') {
            const errorCode = response[5];
            const errorText = response[7];
            throw new ExchangeError(this.id + ' ' + response[6] + ': ' + errorText + ' (#' + errorCode + ')');
        }
        const orders = this.safeValue(response, 4, []);
        const order = this.safeValue(orders, 0);
        return this.parseOrder(order, market);
    }

}

module.exports = {bitfinex2}