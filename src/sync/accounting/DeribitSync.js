const { BaseExchangeSync } = require("./BaseExchangeSync");
const models = require("../../../models");
const { LedgerTypes } = require("../../crypto/exchanges/BaseExchange");
const { default: BigNumber } = require("bignumber.js");
const { create } = require("lodash");
const { Deribit } = require("../../crypto/exchanges/Deribit");
const { BaseExchangeCcxtTrade } = require("../../crypto/exchanges/ccxt/BaseExchangeCcxtTrade");
const { safeString, safeFloat } = require("../../crypto/exchanges/ccxt/safeUtils");

/** @typedef {import('../../crypto/exchanges/BaseExchange').ExtendedLedgerEntry} ExtendedLedgerEntry */
/** @typedef {import("../../crypto/exchanges/BaseExchange").UserInfo} UserInfo */
/** @typedef {import("../../crypto/exchanges/ccxt/BaseExchangeCcxtTrade").BaseExchangeCcxtTrade} BaseExchangeCcxtTrade */

class DeribitSync extends BaseExchangeSync {
    async sync(accountId) {
        let userInfos = await this.exchange.userInfoAccounts();
        let userDict = {};
        for(let i=0;i<userInfos.length;i++) {
            let userInfo = userInfos[i];
            userDict[userInfo.id] = userInfo;
        }

        let created = await this.syncLedger(accountId, userDict);
        return created;
        //let created2 = await this.syncTrades(accountId, userDict);
        //return created | created2;
    }

    async syncLedger(accountId, userDict) {
        const codes = ['BTC', 'ETH', 'USDC'];
        let globalCreate = false;
        for (let i=0;i<codes.length;i++) {
            let code = codes[i];
            let ledgerSyncCode = 'ledger-'+code;
            let lastTs = null;
            let endpoint = await this.repository.getLastSyncEndpoint(accountId, ledgerSyncCode);
            let since = 1000;
            if (endpoint != null){
                since = endpoint.last_ts;
            }

            let limit = 1000;
            let entries = await this.exchange.fetchExtendedLedger(code, since, limit);
            let created = false;
            console.log(`DeribitSync: ${accountId} last ledger-${code} request response lenght: ${entries.length}`)
            for(let i=0;i<entries.length;i++) {
                let entry = entries[i];
                /** @type {UserInfo} */
                let userInfo = this.exchange.ccxtExchange.safeValue(userDict, entry.account);
                let holder = this.exchange.ccxtExchange.safeString(userInfo, 'holder');
                let curCreated;
                if (entry.fee != undefined && entry.fee.cost > 0) {
                    let feeEntry = this.getFeeExtendedLedgerEntry(entry);
                    if (feeEntry) {
                        curCreated = await this.repository.addLedger(accountId, this.exchange.getExchangeName(), holder,feeEntry);
                        created = created | curCreated;
                    }
                }


                curCreated = await this.repository.addLedger(accountId, this.exchange.getExchangeName(), holder, entry);
                created = created | curCreated;

                if (entry.type == 'trade') {
                    let trade = this.generateTradeFromExtenderLedgerEntry(entry);
                    curCreated = await this.repository.addExecution(accountId, this.exchange.getExchangeName(), holder, trade);
                    created = created | curCreated;
                }

                lastTs = entry.timestamp;
            }

            if (lastTs != null) {
                await this.repository.setLastSyncEndpoint(accountId, ledgerSyncCode, lastTs);
            }

            globalCreate = globalCreate | create;
        }

        return globalCreate;
    }
    // Use ledger to sync trades
    //async syncTrades(accountId, userDict) {
    //    let lastTs = null;
    //    let endpoint = await this.repository.getLastSyncEndpoint(accountId, 'trades');
    //    let since = 1000;
    //    if (endpoint != null){
    //        since = endpoint.last_ts;
    //    }
    //
    //    let limit = 1000;
    //    let entries = await this.exchange.fetchMyTrades(undefined, since, limit, {sort: 1});
    //    let created = false;
    //    console.log(`DeribitSync: ${accountId} last trades request response lenght: ${entries.length}`)
    //    for(let i=0;i<entries.length;i++) {
    //        let entry = entries[i];console.log("trade------");console.log(entry);
    //        /** @type {UserInfo} */
    //        let userInfo = this.exchange.ccxtExchange.safeValue(userDict, entry.account);
    //        let holder = this.exchange.ccxtExchange.safeString(userInfo, 'holder');            
    //        let curCreated = await this.repository.addExecution(accountId, this.exchange.getExchangeName(), holder, entry);
    //        created = created | curCreated;
    //        lastTs = entry.timestamp;
    //    }
    //
    //    if (lastTs != null) {
    //        await this.repository.setLastSyncEndpoint(accountId, 'trades', lastTs);
    //    }
    //
    //    return created;
    //}

    /**
     * 
     * @param {ExtendedLedgerEntry} entry 
     */
    getFeeExtendedLedgerEntry(entry) {
        let side = this.exchange.ccxtExchange.safeString(entry.info, 'side');
        /** @type {ExtendedLedgerEntry} */
        let newEntry = {
            account: entry.account,
            after: new BigNumber(entry.before).plus(entry.fee.cost).toFixed(),
            amount: entry.fee.cost,
            before: entry.before,
            currency: entry.fee.currency,
            datetime: entry.datetime,
            direction: entry.direction,
            fee: undefined,
            id: "" + entry.id +"@0",
            info: entry.info,
            newFAmountNoChange: entry.fee.cost,
            newFDescription: entry.newFDescription,
            newFHolder: entry.newFHolder,
            newFOrderId: entry.newFOrderId,
            newFOtherData: entry.newFOtherData,
            newFSubtype: Deribit.parseExtendedLedgerEntrySide4Fee(side),
            newFSymbol: entry.newFSymbol,
            newFType: entry.newFType,
            newFWallet: entry.newFWallet,
            referenceAccount: entry.referenceAccount,
            referenceId: entry.referenceId,
            status: entry.status,
            timestamp: entry.timestamp,
            type: entry.type,
        }

        if (newEntry.newFType == LedgerTypes.LEDGER_WITHDRAWAL_TYPE) {
            newEntry.newFType = LedgerTypes.LEDGER_FEE_TYPE;
            newEntry.newFSubtype = LedgerTypes.LEDGER_WITHDRAWAL_FEE_SUBTYPE;
        } else {
            newEntry.newFType = LedgerTypes.LEDGER_FEE_TYPE;
            newEntry.newFSubtype = LedgerTypes.LEDGER_OTHER_FEE_SUBTYPE;
        }

        entry.id = "" + entry.id + "@1";
        entry.before = newEntry.after;
        return newEntry;
    }

    /**
     * 
     * @param {ExtendedLedgerEntry} entry 
     * @returns {BaseExchangeCcxtTrade}
     */
    generateTradeFromExtenderLedgerEntry(entry) {
        let symbol = safeString(entry.info, 'instrument_name');
        if (symbol in this.exchange.marketsById) {
            const markets = this.exchange.marketsById[symbol];
            if (markets.length > 0) { 
                symbol = markets[0]['symbol'];
            }
        }

        let cost = safeFloat(entry.info, 'cashflow');
        if (cost < 0) {
            cost = -cost;
        }

        // we only fill required fields for our database
        return new BaseExchangeCcxtTrade({
            account: entry.account,
            wallet: entry.newFWallet,
            symbol: symbol,
            order: safeString(entry.info,'order_id'),
            id: safeString(entry.info, 'trade_id'),
            timestamp: entry.timestamp,
            datetime: entry.datetime,
            price: safeFloat(entry.info, 'price'),
            amount: safeFloat(entry.info, 'amount'),
            cost,
            fee: {
                cost: entry.fee != undefined ? entry.fee.cost : 0,
                currency: entry.fee != undefined ? entry.fee.currency : '',
            }
        });
    }

    
}

module.exports = { DeribitSync }