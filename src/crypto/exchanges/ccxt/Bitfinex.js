const { OrderNotFound } = require("ccxt");
const { LedgerTypes } = require("../BaseExchange");
const {BaseExchangeCcxt} = require("./BaseExchangeCcxt");
const { BaseExchangeCcxtOrder } = require("./BaseExchangeCcxtOrder");
const {BaseExchangeCcxtPosition} = require("./BaseExchangeCcxtPosition");

/** @typedef {import('../BaseExchange').ExchangeOptions} ExchangeOptions */
/** @typedef {import('../BaseExchange').ExtendedLedgerEntry} ExtendedLedgerEntry */
/** @typedef {import('../BaseExchange').UserInfo} UserInfo */


const marketsFilter = {
    "paper" : {
        "spot": ([k, v]) => k.startsWith('TEST') && v.spot,
        "future": ([k, v]) => k.startsWith('TEST') && v.swap,
        "funding": ([k, v]) => false,
    },
    "real": {
        "spot": ([k, v]) => !k.startsWith('TEST') && v.spot,
        "future": ([k, v]) => !k.startsWith('TEST') && v.swap,
        "funding": ([k, v]) => false,
    }
};

class Bitfinex extends BaseExchangeCcxt {
    /**
     * 
     * @param {ExchangeOptions} params 
     */
    constructor(params = {}) {
        super('bitfinex2', params);
    }

    /** @inheritdoc */
    async createOrder(symbol, type, side, amount, price = undefined, options = {}) {
        return new BaseExchangeCcxtOrder(
            await this.ccxtExchange.createOrder(
                symbol,
                type,
                side,
                amount,
                price,
                {
                    lev: this.params.exchangeType != 'spot' ? options.leverage : undefined, 
                }
            )
        );
    }

     /** @inheritdoc */
     get currencies() {
        let keys = Object.keys(this.ccxtExchange.currencies);;
        if (this.params.paper) {
            return keys.filter(x => x.startsWith('TEST'));
        } else {
            return keys.filter(x => !x.startsWith('TEST'));
        }
    }

    /** @inheritdoc */
    currencyNotFoundForMarket(symbol, side) {
        let market = this.ccxtExchange.market(symbol);
        return side == 'buy' ? market.quote : market.base;
    }

    /** @inheritdoc */
    getExchangeName() {
        return "Bitfinex";
    }


    /** @inheritdoc */
    async getMarkets() {
        let markets = await super.getMarkets();
        let filter = marketsFilter[this.params.paper?'paper':'real'][this.params.exchangeType];
        if (filter == null) {
            filter = ([k, v]) => false;
        }

        return Object.fromEntries(Object.entries(markets).filter(filter));
    }

    /** @inheritdoc */
    async fetchBalance() {
        return await this.ccxtExchange.fetchBalance({type: this.params.exchangeType == 'spot' ? 'exchange':'margin'});
    }

    /** @inheritdoc */
    async fetchBalanceDepositWallet() {
        return await this.ccxtExchange.fetchBalance({type: 'exchange'});
    }

    /** @inheritdoc */
    async fetchOrder(id, symbol = undefined) {
        try {
            return new BaseExchangeCcxtOrder(
                await this.ccxtExchange.fetchOpenOrder(id, symbol)
            );
        } catch (ex) {
            if (ex instanceof OrderNotFound) {
                return new BaseExchangeCcxtOrder(
                    await this.ccxtExchange.fetchClosedOrder(id, symbol)
                );
            }
            throw ex;
        }
    }
    
    /** @inheritdoc */
    async fetchPositions(symbols = undefined) {
        let positions = await this.ccxtExchange.fetchPositions(symbols);
        let newPositions = [];
        positions.forEach(p => {
            newPositions.push(new BaseExchangeCcxtPosition({
                contracts: p[2],
                info: p
            }));
        })

        return newPositions;
    }

    /** @inheritdoc */
    getThrottlerHash(exchangeType, paper) {
        return this.ccxtExchange.id;
    }


    /** @inheritdoc */
    getWalletNames() {
        return ['spot', 'funding', 'future', 'margin'];
    }

    /** @inheritdoc */
    get markets() {
        let filter = marketsFilter[this.params.paper?'paper':'real'][this.params.exchangeType];
        if (filter == null) {
            filter = ([k, v]) => false;
        }
        console.log("filtering");
        return Object.fromEntries(Object.entries(this.ccxtExchange.markets).filter(filter));
    }   

    /**
     * 
     * @param {ExtendedLedgerEntry} entry 
     */
    parseExtendedLedgerEntry(entry) {
        let description = entry.info[8];
        let type = undefined;
        let amount = entry.amount;
        if (description != undefined) {
            const parts = description.split(' @ ');
            type = this.ccxtExchange.safeStringLower(parts, 0);
            const parts2 = type.split(" ");
            type = this.ccxtExchange.safeStringLower(parts2, 0) + " " +
                this.ccxtExchange.safeStringLower(parts2, 1) + " " +
                this.ccxtExchange.safeStringLower(parts2, 2);
            entry.newFDescription = description;

            const walletParts = description.split("on wallet ");
            if (walletParts.length == 2) {
                entry.newFWallet = this.ccxtExchange.safeStringLower(walletParts, 1);
            }
        }

        entry.status = 'ok';
        entry.newFAmountChange = entry.amount;
        
        if (type == undefined) {
            entry.newFType = amount > 0 ? LedgerTypes.LEDGER_OTHER_CREDIT_TYPE : LedgerTypes.LEDGER_OTHER_DEBIT_TYPE;
        } else if (type.indexOf('deposit') >= 0) {
            entry.newFType = LedgerTypes.LEDGER_DEPOSIT_TYPE;
            entry.newFType = LedgerTypes.LEDGER_DEPOSIT_SUBTYPE;
        } else if (type.indexOf('canceled withdrawal fee') >= 0) {
            entry.newFType = LedgerTypes.LEDGER_FEE_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_CANCELED_WITHDRAWAL_FEE_SUBTYPE;
            entry.status = 'canceled';
        } else if (type.indexOf('canceled withdrawal') >= 0) {
            entry.newFType = LedgerTypes.LEDGER_WITHDRAWAL_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_CANCELLED_WITHDRAWAL_SUBTYPE;
            entry.status = 'canceled';
        } else if (type.indexOf('withdrawal fee') >= 0) {
            entry.newFType = LedgerTypes.LEDGER_FEE_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_WITHDRAWAL_FEE_SUBTYPE;
        } else if (type.indexOf('withdrawal') >= 0) {
            entry.newFType = LedgerTypes.LEDGER_FEE_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_WITHDRAWAL_FEE_SUBTYPE;
        } else if (type.indexOf('trading fees') >= 0) {
            entry.newFType = LedgerTypes.LEDGER_FEE_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_TRADING_FEE_SUBTYPE;
        } else if (type.indexOf('exchange') >= 0) {
            entry.newFType = LedgerTypes.LEDGER_TRADE_TYPE;
        } else if (type.indexOf('position') >= 0) {
            entry.newFType = LedgerTypes.LEDGER_SETTLEMENT_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_SETTLEMENT_SUBTYPE;
        } else if (type.indexOf('rebate') >= 0) {
            if (amount > 0) {
                entry.newFType = LedgerTypes.LEDGER_OTHER_CREDIT_TYPE;
                entry.newFSubtype = LedgerTypes.LEDGER_OTHER_CREDIT_SUBTYPE;
            } else {
                entry.newFType = LedgerTypes.LEDGER_OTHER_DEBIT_TYPE;
                entry.newFSubtype = LedgerTypes.LEDGER_OTHER_DEBIT_SUBTYPE;
            }
        } else if (type.indexOf('transfer') >= 0) {
            entry.newFType = LedgerTypes.LEDGER_TRANSFER_TYPE;
        } else if (type.indexOf('settlement') >= 0) {
            entry.newFType = LedgerTypes.LEDGER_SETTLEMENT_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_SETTLEMENT_SUBTYPE;
        } else if (type.indexOf('payment') >= 0) {
            if (amount > 0) {
                entry.newFType = LedgerTypes.LEDGER_OTHER_CREDIT_TYPE;
                entry.newFSubtype = LedgerTypes.LEDGER_OTHER_CREDIT_SUBTYPE;
            } else {
                entry.newFType = LedgerTypes.LEDGER_OTHER_DEBIT_TYPE;
                entry.newFSubtype = LedgerTypes.LEDGER_OTHER_DEBIT_SUBTYPE;
            }
        } else if (type.indexOf('funding event') >= 0) {
            entry.newFType = LedgerTypes.LEDGER_FEE_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_FUNDING_FEE_SUBTYPE;
        } else if (type.indexOf('fee') >= 0 || type.indexOf('charged') >= 0) {
            entry.newFType = LedgerTypes.LEDGER_FEE_TYPE;
            entry.newFSubtype = LedgerTypes.LEDGER_OTHER_FEE_SUBTYPE;
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

    /** @inheritdoc */
    parseExtendedTrade(entry) {
        entry.account = this.ccxtExchange.safeString(entry.info, 'account');
        return entry;
    }
    
    /** @inheritdoc */
    async transfer(code, amount, fromAccount, toAccount) {
        let params = {};
        if (fromAccount == 'future' || toAccount == 'future') {
            //let derivCode = code == 'USDT' ? 'USDTF0' : (code == 'TESTUSDT' ? 'TESTUSDTF0': code);
            if (fromAccount == 'future') {
                //params.currency_to = code;
                //params.currency = derivCode;
                fromAccount = 'derivatives';
            } else {
                //params.currency_to = derivCode;
                toAccount = 'derivatives';
            }
        }
        
        return await this.ccxtExchange.transfer(code, amount, fromAccount, toAccount, params);
    }

    /** @inheritdoc */
    async userInfo() {
        /* FORMAT NOT VERIFIED!!
        Bitfinex
        [
        1,                            // ID int	Account ID
        '',                           // EMAIL	string	Account Email
        '',                           // USERNAME	string	Account username
        1672418364000,                // MTS_ACCOUNT_CREATE	int	Millisecond timestamp of account creation
        1,                            // VERIFIED	int	Indicates if the user has a verified status (KYC) 1 = true, 0 = false
        3,                            // VERIFICATION_LEVEL	int	Account verification level
        null,                         // 
        'UTC',                        // TIMEZONE	string	Account timezone setting
        'en',                         // LOCALE	string	Account locale setting
        'bitfinex',                   // COMPANY	string	Shows where the account is registered. Accounts registered at Bitfinex will show 'bitfinex' and accounts registered at eosfinex will show 'eosfinex'
        1,                            // EMAIL_VERIFIED	int	1 if true
        null,                         // SUBACCOUNT_TYPE	TBD	TBD
        null,                         // MTS_MASTER_ACCOUNT_CREATE	int	Millisecond timestamp of master account creation
        null,                         // GROUP_ID	int	Account group ID
        12,                           // MASTER_ACCOUNT_ID	int	The ID of the master account, If the account is a sub-account.
        8992,                         // INHERIT_MASTER_ACCOUNT_VERIFICATION	int	1 if account inherits verification from master account
        3553773,                      // IS_GROUP_MASTER	int	1 if account is a master account
        1,                            // GROUP_WITHDRAW_ENABLED	int	1 if enabled
        1,                            // PPT_ENABLED	int	1 if true (for paper trading accounts)
        1,                            // MERCHANT_ENABLED	int	1 if true (for merchant accounts)
        null,                         // 
        null,                         // 
        0,                            // COMPETITION_ENABLED	int	1 if true (for competition accounts)
        null,                         // 
        null,                         // 
        null,                         // 
        [ 'otp' ],                    // 2FA_MODES	array of strings	Array of enabled 2FA modes ('u2f', 'otp')
        null,                         // 
        0,                            // IS_SECURITIES_MASTER	int	1 if true (when the account has a securities sub-account)
        null,                         //
        null,                         //
        null,                         //
        null,                         //
        null,                         //
        0,                            // SECURITIES_ENABLED	int	1 if true (for securities accounts)
        null,                         //
        null,                         //
        null,                         //
        0,                            // ALLOW_DISABLE_CTXSWITCH	int	Account can disable context switching by master account into this account (1 if true)
        0,                            // CTXTSWITCH_DISABLED	int	Master account cannot context switch into this account (1 if true)
        null,                         //
        null,                         //
        null,                         //
        null,                         //
        '2023-07-27T21:28:59.333Z',   // TIME_LAST_LOGIN	int	Date and time of last login
        null,                         //
        null,                         //
        3,                            // VERIFICATION_LEVEL_SUBMITTED	int	Level of highest verification application submitted from the account
        null,                         //
        [ 'ES', 'ES_MD' ],            // COMP_COUNTRIES	array	Array of country codes based on your verification data (residence and nationality)
        [ 'ES', 'ES_MD' ],            // COMPL_COUNTRIES_RESID	array	Array of country codes based on your verification data (residence only)
        'corporate',                  // COMPL_ACCOUNT_TYPE	string	Type of verification ("individual" or "corporate")
        null,                         // 
        null,                         //
        0                             // IS_MERCHANT_ENTERPRISE
        ]

        */
       let info = await this.ccxtExchange.privatePostAuthRInfoUser();

       /** @type {UserInfo} */
        let data = {
            id: this.ccxtExchange.safeString(info, 0),
            email: this.ccxtExchange.safeString(info, 1),
            holder: this.ccxtExchange.safeString(info, 2),
            name: this.ccxtExchange.safeString(info, 2),
            info: info
        };

        return data;
    }

     /** @inheritdoc */
     async userInfoAccounts() {
        return [await this.userInfo()];
     }

    /** @inheritdoc */
    async watchBalance(accountType = undefined) {
        accountType = accountType != undefined ? accountType : this.params.exchangeType;
        return await this.ccxtExchange.watchBalance({wallet: accountType == 'spot' ? 'exchange':'margin'});
    }
}

module.exports = { Bitfinex }