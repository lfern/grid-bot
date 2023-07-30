const ccxt = require('ccxt');

class deribit extends ccxt.pro.deribit {
    async fetchLedger(code = undefined, since = undefined, limit = undefined, params = {}) {
        /**
         * @method
         * @name bitmex#fetchLedger
         * @description fetch the history of changes, actions done by the user or operations that altered balance of the user
         * @param {string|undefined} code unified currency code, default is undefined
         * @param {int|undefined} since timestamp in ms of the earliest ledger entry, default is undefined
         * @param {int|undefined} limit max number of ledger entrys to return, default is undefined
         * @param {object} params extra parameters specific to the bitmex api endpoint
         * @returns {object} a [ledger structure]{@link https://docs.ccxt.com/#/?id=ledger-structure}
         */

        if (code == undefined) {
            throw new ArgumentsRequired(this.id + ' fetchLedger() requires a code argument');
        }

        if (since == undefined) {
            throw new ArgumentsRequired(this.id + ' fetchLedger() requires a since argument');
        }

        await this.loadMarkets();
        let currency = this.currency(code);
        const now = this.milliseconds();
        const request = {
            start_timestamp: since,
            end_timestamp: now,
            currency: currency['id'],
        };

        if (limit != undefined) {
            request['count'] = limit;
        }
        const response = await this.privateGetGetTransactionLog(this.extend(request, params));
        //{
        //    "jsonrpc": "2.0",
        //    "id": 4,
        //    "result": {
        //      "logs": [
        //        {
        //          "username": "TestUser",
        //          "user_seq": 6005,
        //          "user_role": "maker",
        //          "user_id": 7,
        //          "type": "trade",
        //          "trade_id": "28349",
        //          "timestamp": 1613657734620,
        //          "side": "close buy",
        //          "profit_as_cashflow": false,
        //          "price_currency": "BTC",
        //          "price": 0.1537,
        //          "position": 0,
        //          "order_id": "67546",
        //          "mark_price": 0.04884653215049635,
        //          "interest_pl": 0,
        //          "instrument_name": "BTC-19FEB21-49200-C",
        //          "info": "Source: api",
        //          "id": 61288,
        //          "equity": 3002.83270455,
        //          "currency": "BTC",
        //          "commission": 0,
        //          "change": -0.04611,
        //          "cashflow": -0.04611,
        //          "balance": 3003.17813712,
        //          "amount": 0.3
        //        }
        //      ],
        //      "continuation": 61282
        //    }
        //}
        const result = this.safeValue(response, 'result', {});
        const logs = this.safeValue(result, 'logs', []);
        return this.parseLedger(logs, currency, since, limit);
    }

    parseLedgerEntryType(type) {
        const types = {
            'trade': 'trade',
            'deposit': 'transaction',
            'withdrawal': 'transaction',
            'settlement': 'settlement',
            'delivery': 'delivery',
            'transfer': 'transfer',
            'swap': 'swap', 
            'correction': 'correction',
        };
        return this.safeString(types, type, type);
    }

    parseLedgerEntry(item, currency = undefined) {

        // {
        //   "username": "TestUser",
        //   "user_seq": 6005,
        //   "user_role": "maker",
        //   "user_id": 7,
        //   "type": "trade",
        //   "trade_id": "28349",
        //   "timestamp": 1613657734620,
        //   "side": "close buy",
        //   "profit_as_cashflow": false,
        //   "price_currency": "BTC",
        //   "price": 0.1537,
        //   "position": 0,
        //   "order_id": "67546",
        //   "mark_price": 0.04884653215049635,
        //   "interest_pl": 0,
        //   "instrument_name": "BTC-19FEB21-49200-C",
        //   "info": "Source: api",
        //   "id": 61288,
        //   "equity": 3002.83270455,
        //   "currency": "BTC",
        //   "commission": 0,
        //   "change": -0.04611,
        //   "cashflow": -0.04611,
        //   "balance": 3003.17813712,
        //   "amount": 0.3
        // }

        const id = this.safeString(item, 'id');
        const type = this.parseLedgerEntryType(this.safeString(item, 'type'));
        const currencyId = this.safeString(item, 'currency');
        const code = this.safeCurrencyCode(currencyId, currency);
        let account = this.safeString(item, 'username');
        let amount = this.safeNumber(item, 'amount');
        let timestamp = this.safeInteger(item, 'timestamp');
        if (timestamp === undefined) {
            // https://github.com/ccxt/ccxt/issues/6047
            // set the timestamp to zero, 1970 Jan 1 00:00:00
            // for transactions without a timestamp
            timestamp = 0; // see comments above
        }
        let feeCost = this.safeNumber(item, 'commission', 0);
        const fee = {
            'cost': feeCost,
            'currency': code,
        };
        let after = this.safeNumber(item, 'balance');
        const before = this.sum(after, -amount);
        let direction = undefined;
        if (amount < 0) {
            direction = 'out';
            amount = Math.abs(amount);
        }
        else {
            direction = 'in';
        }
        const status = 'ok';

        // {
        //     'id': 'hqfl-f125f9l2c9',                // string id of the ledger entry, e.g. an order id
        //     'direction': 'out',                     // or 'in'
        //     'account': '06d4ab58-dfcd-468a',        // string id of the account if any
        //     'referenceId': 'bf7a-d4441fb3fd31',     // string id of the trade, transaction, etc...
        //     'referenceAccount': '3146-4286-bb71',   // string id of the opposite account (if any)
        //     'type': 'trade',                        // string, reference type, see below
        //     'currency': 'BTC',                      // string, unified currency code, 'ETH', 'USDT'...
        //     'amount': 123.45,                       // absolute number, float (does not include the fee)
        //     'timestamp': 1544582941735,             // milliseconds since epoch time in UTC
        //     'datetime': "2018-12-12T02:49:01.735Z", // string of timestamp, ISO8601
        //     'before': 0,                            // amount of currency on balance before
        //     'after': 0,                             // amount of currency on balance after
        //     'status': 'ok',                         // 'ok, 'pending', 'canceled'
        //     'fee': {                                // object or or undefined
        //         'cost': 54.321,                     // absolute number on top of the amount
        //         'currency': 'ETH',                  // string, unified currency code, 'ETH', 'USDT'...
        //     },
        //     'info': { ... },                        // raw ledger entry as is from the exchange
        // }

        return {
            'id': id,                           
            'info': item,
            'timestamp': timestamp,
            'datetime': this.iso8601(timestamp),
            'direction': direction,
            'account': account,
            'referenceId': undefined,
            'referenceAccount': undefined,
            'type': type,
            'currency': code,
            'amount': amount,
            'before': before,
            'after': after,
            'status': status,
            'fee': fee,
        };
    }

}

module.exports = {deribit}