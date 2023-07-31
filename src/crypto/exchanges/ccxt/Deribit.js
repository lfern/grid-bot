const { OrderNotFound } = require("ccxt");
const { LedgerTypes } = require("../BaseExchange");
const {BaseExchangeCcxt} = require("./BaseExchangeCcxt");
const { BaseExchangeCcxtOrder } = require("./BaseExchangeCcxtOrder");
const {BaseExchangeCcxtPosition} = require("./BaseExchangeCcxtPosition");
const { safeString, isString } = require("./safeUtils");

/** @typedef {import('../BaseExchange').ExchangeOptions} ExchangeOptions */
/** @typedef {import('../BaseExchange').ExtendedLedgerEntry} ExtendedLedgerEntry */
/** @typedef {import('../BaseExchange').UserInfo} UserInfo */

class Deribit extends BaseExchangeCcxt {
    /**
     * 
     * @param {ExchangeOptions} params 
     */
    constructor(params = {}) {
        super('deribit', params);
    }

    /** @inheritdoc */
    getExchangeName() {
        return "Deribit";
    }

    /** @inheritdoc */
    getThrottlerHash(exchangeType, paper) {
        return this.ccxtExchange.id;
    }

    /** @inheritdoc */
    getWalletNames() {
        return ['spot', 'funding', 'future', 'margin'];
    }

    /**
     * 
     * @param {ExtendedLedgerEntry} entry 
     */
    parseExtendedLedgerEntry(entry) {
        entry.newFAmountNoChange = this.ccxtExchange.safeNumber(entry.info, 'amount');
        if (entry.direction == 'out') {
            entry.amount = -entry.amount;
            if (entry.newFAmountNoChange != undefined) {
                entry.newFAmountNoChange = -entry.newFAmountNoChange;
            }
        }

        let entryInfo = this.ccxtExchange.safeValue(entry.info, 'info');
        if (isString(entryInfo)) {
            entry.newFDescription = entryInfo;
        } else {
            entry.newFOtherData = entryInfo;
        }
        
        entry.newFOrderId = this.ccxtExchange.safeString(entry.info, 'order_id');
        entry.newFWallet = entry.currency;

        let type = this.ccxtExchange.safeString(entry.info, 'type');
        if (type == 'trade') {
            entry.newFType = LedgerTypes.LEDGER_TRADE_TYPE;
            let side = this.ccxtExchange.safeString(entry.info, 'side');
            entry.newFSubtype = this.parseExtendedLedgerEntrySide(side);
        } else if (type == 'deposit') {
            entry.newFType = LedgerTypes.LEDGER_DEPOSIT_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_DEPOSIT_SUBTYPE;
        } else if (type == 'withdrawal') {
            entry.newFType = LedgerTypes.LEDGER_WITHDRAWAL_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_WITHDRAWAL_SUBTYPE;
        } else if (type == 'settlement') {
            entry.newFType = LedgerTypes.LEDGER_SETTLEMENT_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_SETTLEMENT_SUBTYPE;
        } else if (type == 'delivery') {
            entry.newFType = LedgerTypes.LEDGER_SETTLEMENT_TYPE;
            entry.newFType = LedgerTypes.LEDGER_SETTLEMENT_SUBTYPE;
            entry.newFDescription = entry.newFDescription + " delivery";
        } else if (type == 'transfer') {
            entry.newFType = LedgerTypes.LEDGER_TRANSFER_TYPE;
        } else if (type == 'swap') {
            entry.newFType = LedgerTypes.LEDGER_TRADE_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_SPOT_TRADE_SUBTYPE;
        } else if (type == 'correction') {
            entry.newFType = LedgerTypes.LEDGER_WITHDRAWAL_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_CANCELLED_WITHDRAWAL_SUBTYPE; 
            entry.status = 'canceled';
        } else {
            if (amount > 0) {
                entry.newFType = LedgerTypes.LEDGER_OTHER_CREDIT_TYPE;
                entry.newFSubtype = LedgerTypes.LEDGER_OTHER_CREDIT_SUBTYPE;
            } else {
                entry.newFType = LedgerTypes.LEDGER_OTHER_DEBIT_TYPE;
                entry.newFSubtype = LedgerTypes.LEDGER_OTHER_DEBIT_SUBTYPE;
            }
        }

        if (entry.newFSubtype != LedgerTypes.LEDGER_DEPOSIT_TYPE || entry.newFSubtype != LedgerTypes.LEDGER_WITHDRAWAL_TYPE) {
            entry.newFSymbol = this.ccxtExchange.safeString(entry.info, 'instrument_name');
        }

        return entry;
    }

    parseExtendedLedgerEntrySide(side) {
        const types = {
            'spot sell': LedgerTypes.LEDGER_SPOT_TRADE_SUBTYPE,
            'spot buy': LedgerTypes.LEDGER_SPOT_TRADE_SUBTYPE,
            'open sell': LedgerTypes.LEDGER_DERIVATIVE_TRADE_SUBTYPE,
            'open buy': LedgerTypes.LEDGER_DERIVATIVE_TRADE_SUBTYPE,
            'close sell': LedgerTypes.LEDGER_DERIVATIVE_TRADE_SUBTYPE,
            'close buy': LedgerTypes.LEDGER_DERIVATIVE_TRADE_SUBTYPE,
            'long buy': LedgerTypes.LEDGER_DERIVATIVE_TRADE_SUBTYPE, 
            'long sell': LedgerTypes.LEDGER_DERIVATIVE_TRADE_SUBTYPE,
        };

        return this.ccxtExchange.safeString(types, side);
    }

    static parseExtendedLedgerEntrySide4Fee(side) {
        const types = {
            'spot sell': LedgerTypes.LEDGER_TRADING_FEE_SUBTYPE,
            'spot buy': LedgerTypes.LEDGER_TRADING_FEE_SUBTYPE,
            'open sell': LedgerTypes.LEDGER_TRADING_FEE_SUBTYPE,
            'open buy': LedgerTypes.LEDGER_TRADING_FEE_SUBTYPE,
            'close sell': LedgerTypes.LEDGER_TRADING_FEE_SUBTYPE,
            'close buy': LedgerTypes.LEDGER_TRADING_FEE_SUBTYPE,
            'long buy': LedgerTypes.LEDGER_TRADING_FEE_SUBTYPE, 
            'long sell': LedgerTypes.LEDGER_TRADING_FEE_SUBTYPE,
        };

        return safeString(types, side);
    }

    
    /** @inheritdoc */
    parseExtendedTrade(entry) {
        entry.account = this.ccxtExchange.safeString(entry.info, 'username');
        entry.wallet = entry.currency;
        return entry;
    }

    /** @inheritdoc */
    async userInfoAccounts() {
        /*
        {
            jsonrpc: '2.0',
            result: [
                {
                username: '',
                type: 'main',
                system_name: '',
                security_keys_enabled: true,
                security_keys_assignments: [Array],
                receive_notifications: false,
                proof_id_signature: '',
                proof_id: '',
                login_enabled: true,
                is_password: true,
                id: '277107',
                email: ''
                }
            ],
            usIn: '',
            usOut: '',
            usDiff: '',
            testnet: false
            }
            */
        let response = await this.ccxtExchange.privateGetGetSubaccounts();
        const result = this.ccxtExchange.safeValue(response, 'result', {});

        let userInfos = [];
        for(let i=0;i<result.length;i++) {
            let res = result[i];
            /** @type {UserInfo} */
            let userInfo = {
                id: this.ccxtExchange.safeString(res, 'id'),
                email: this.ccxtExchange.safeString(res, 'email'),
                holder: this.ccxtExchange.safeString(res, 'system_name'),
                info: res,
                name: this.ccxtExchange.safeString(res, 'username'),
            }
            userInfos.push(userInfo);
        }

        return userInfos;
    }
    
    
}

module.exports = { Deribit }