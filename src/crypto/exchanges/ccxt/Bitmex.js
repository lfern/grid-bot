const {BaseExchangeCcxt} = require("./BaseExchangeCcxt");
const { BaseExchangeCcxtOrder } = require("./BaseExchangeCcxtOrder");
const {TRUNCATE, ArgumentsRequired} = require('ccxt');
const { LedgerTypes } = require("../BaseExchange");
const { entries } = require("lodash");

/** @typedef {import('../BaseExchange').ExtendedLedgerEntry} ExtendedLedgerEntry */
/** @typedef {import('../BaseExchange').UserInfo} UserInfo */

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
    getExchangeName() {
        return "BitMEX";
    }
    

    /** @inheritdoc */
    async fetchLedger(code = undefined, since = undefined, limit = undefined, params = {}) {
        if (code == undefined) {
            params = this.ccxtExchange.deepExtend({currency: 'all'}, params);
        }

        return await this.ccxtExchange.fetchLedger(code, since, limit, params)   
    }
    

    /** @inheritdoc */
    async fetchMyTrades(symbol = undefined, since = undefined, limit = undefined, params = {}) {
        // for funding fees {filter: {execType:'Funding'}}
        // for all {filter: {execType:undefined}}
        let params2 = this.ccxtExchange.deepExtend({filter: {execType: 'Trade'}}, params);
        return super.fetchMyTrades(symbol, since, limit, params2);
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

    /**
     * 
     * @param {ExtendedLedgerEntry} entry 
     */
    parseExtendedLedgerEntry(entry) {
        entry.newFWallet = entry.currency;
        entry.newFAmountChange = entry.amount;
        entry.newFDescription = this.ccxtExchange.safeString(entry.info, 'text');

        const type = this.ccxtExchange.safeString(entry.info, 'transactType');
        const address = this.ccxtExchange.safeString(entry.info, 'address');       
        if (type != 'Withdrawal') {
            const symbol = this.ccxtExchange.safeSymbol(address, undefined);
            entry.newFSymbol = symbol;
        } else {
            entry.newFOtherData = {address: address};
        }

        if (entry.direction == 'out') {
            entry.amount = -entry.amount;
            if (entry.newFAmountChange != undefined) {
                entry.newFAmountChange = -entry.newFAmountChange;
            }
        }

        entry.newFWallet = entry.currency;

        if (type == 'Withdrawal') {
            entry.newFType = LedgerTypes.LEDGER_WITHDRAWAL_TYPE;
            if (entry.status == 'canceled') {
                entry.newFSubtype = LedgerTypes.LEDGER_CANCELLED_WITHDRAWAL_SUBTYPE;
            } else {
                entry.newFSubtype = LedgerTypes.LEDGER_WITHDRAWAL_SUBTYPE;
            }
        } else if (type == 'RealisedPNL') {
            entry.newFType = LedgerTypes.LEDGER_SETTLEMENT_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_SETTLEMENT_SUBTYPE;
        } else if (type == 'UnrealisedPNL') {
            entry.newFType = LedgerTypes.LEDGER_SETTLEMENT_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_SETTLEMENT_SUBTYPE;
        } else if (type == 'Deposit') {
            entry.newFType = LedgerTypes.LEDGER_DEPOSIT_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_DEPOSIT_TYPE;
        } else if (type == 'SpotTrade') {
            entry.newFType = LedgerTypes.LEDGER_TRADE_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_SPOT_TRADE_SUBTYPE;
        } else if (type == 'Transfer') {
            entry.newFType = LedgerTypes.LEDGER_TRANSFER_TYPE;
        } else if (type == 'AffiliatePayout') {
            if (amount > 0) {
                entry.newFType = LedgerTypes.LEDGER_OTHER_CREDIT_TYPE;
                entry.newFSubtype = LedgerTypes.LEDGER_OTHER_CREDIT_SUBTYPE;
            } else {
                entry.newFType = LedgerTypes.LEDGER_OTHER_DEBIT_TYPE;
                entry.newFSubtype = LedgerTypes.LEDGER_OTHER_DEBIT_SUBTYPE;
            }
        } else {
            if (amount > 0) {
                entry.newFType = LedgerTypes.LEDGER_OTHER_CREDIT_TYPE;
                entry.newFSubtype = LedgerTypes.LEDGER_OTHER_CREDIT_SUBTYPE;
            } else {
                entry.newFType = LedgerTypes.LEDGER_OTHER_DEBIT_TYPE;
                entry.newFSubtype = LedgerTypes.LEDGER_OTHER_DEBIT_SUBTYPE;
            }
        }

        return entry;
    }

    /**
     * 
     * @param {ccxt.Trade} entry 
     */
    parseExtendedTrade(entry) {
        entry.account = this.ccxtExchange.safeString(entry.info, 'account');
        return entry;
    }

    /** @inheritdoc */
    async transfer(code, amount, fromAccount, toAccount) {
        throw new Error("NOT IMPLEMENTED");
    }

    /** @inheritdoc */
    async userInfo() {
        /* 
            {
            id: '',
            firstname: '',
            lastname: '',
            username: '',
            accountName: null,
            isUser: true,
            email: '',
            dateOfBirth: '',
            phone: null,
            created: '2023-04-14T22:16:15.010Z',
            lastUpdated: '2023-07-27T09:05:04.784Z',
            preferences: {
                announcementsLastSeen: '2023-07-27T09:04:24.654Z',
                colorTheme: 'light-v3',
                favourites: [ 'XBTUSDT', 'XBT_USDT' ],
                hideFromLeaderboard: true,
                hideNameFromLeaderboard: true,
                hidePhoneConfirm: false,
                isWalletZeroBalanceHidden: true,
                locale: 'en-US',
                localeSetTime: '1685366720630',
                msgsSeen: [ 'firstPosition' ],
                orderClearImmediate: false,
                showLocaleNumbers: true,
                strictIPCheck: false,
                strictTimeout: false
            },
            TFAEnabled: 'GA',
            affiliateID: '',
            country: 'ES',
            geoipCountry: 'ES',
            geoipRegion: 'MD',
            firstTradeTimestamp: '2023-05-26T13:17:57.964Z',
            isRestricted: false,
            citizenshipDeclaration: {},
            authorizedAccounts: {
                margin: {},
                marginShare: [],
                position: {},
                positionShare: [],
                execution: {},
                executionShare: [],
                order: {},
                orderShare: [],
                orderTakeover: [],
                transferTakeover: {},
                internalTransfer: { write: [Array] }
            },
            accounts: [
                {
                id: '',
                name: '',
                role: 'LINKED_ACCOUNT'
                }
            ],
            roles: [
                {
                id: '22',
                name: 'verifiedCorp',
                description: 'Accounts which completed corporate verification',
                created: '2020-07-31T17:51:36.779Z',
                modified: '2020-07-31T17:51:36.779Z'
                }
            ],
            ratelimits: []
            }
        */
       let info = await this.ccxtExchange.privateGetUser();

       /** @type {UserInfo} */
        let data = {
            id: this.ccxtExchange.safeString(info, 'id'),
            email: this.ccxtExchange.safeString(info, 'email'),
            holder: this.ccxtExchange.safeString(info, 'username'),
            name: this.ccxtExchange.safeString(info, 'firstName') + " " + this.ccxtExchange.safeString(info, 'lastName'),
            info: info
        };

        return data;
    }

    /** @inheritdoc */
    async userInfoAccounts() {
        return [await this.userInfo()];
    }
    
}

module.exports = {Bitmex}