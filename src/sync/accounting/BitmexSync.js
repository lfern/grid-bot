const { BaseExchangeSync } = require("./BaseExchangeSync");
const models = require("../../../models");
const { BaseExchangeCcxtTrade } = require("../../crypto/exchanges/ccxt/BaseExchangeCcxtTrade");
const { LedgerTypes } = require("../../crypto/exchanges/BaseExchange");
const { default: BigNumber } = require("bignumber.js");

/** @typedef {import('../../crypto/exchanges/BaseExchange').ExtendedLedgerEntry} ExtendedLedgerEntry */
/** @typedef {import("../../crypto/exchanges/BaseExchange").UserInfo} UserInfo */

class BitmexSync extends BaseExchangeSync {
    async sync(accountId) {
        let userInfo = await this.exchange.userInfo();
        let created = await this.syncLedger(accountId, userInfo);
        let created2 = await this.syncTrades(accountId, userInfo);
        return created | created2;
    }

    async syncLedger(accountId, userInfo) {
        let lastTs = null;
        let endpoint = await this.repository.getLastSyncEndpoint(accountId, 'ledger');
        let since = 1000;
        if (endpoint != null){
            since = endpoint.last_ts;
        }

        let limit = 2500;
        let entries = await this.exchange.fetchExtendedLedger(undefined, since, limit);
        let created = false;
        console.log(`BitmexSync: ${accountId} last ledger request response lenght: ${entries.length}`)
        for(let i=0;i<entries.length;i++) {
            let entry = entries[i];
            if (entry.id == '00000000-0000-0000-0000-000000000000') {
                // skip this ids
                continue;
            }
            
            let curCreated;
            if (entry.fee != undefined && entry.fee.cost > 0) {
                let feeEntry = this.getFeeExtendedLedgerEntry(entry);
                if (feeEntry) {
                    curCreated = await this.repository.addLedger(accountId, this.exchange.getExchangeName(), userInfo.holder, feeEntry);
                    created = created | curCreated;
                }
            }

            curCreated = await this.repository.addLedger(accountId, this.exchange.getExchangeName(), userInfo.holder, entry);
            created = created | curCreated;
            lastTs = entry.timestamp;
        }

        if (lastTs != null) {
            await this.repository.setLastSyncEndpoint(accountId, 'ledger', lastTs);
        }

        return created;
    }

    async syncTrades(accountId, userInfo) {
        let lastTs = null;
        let endpoint = await this.repository.getLastSyncEndpoint(accountId, 'trades');
        let since = 1000;
        if (endpoint != null){
            since = endpoint.last_ts;
        }

        let limit = 500;
        let entries = await this.exchange.fetchMyTrades(undefined, since, limit, {filter: {execType:undefined}});
        let created = false;
        console.log(`BitmexSync: ${accountId} last trades request response lenght: ${entries.length}`)
        for(let i=0;i<entries.length;i++) {
            let entry = entries[i];
            let curCreated;
            // Trade or Funding
            const original = entry.toJson();
            const execType = this.exchange.ccxtExchange.safeString(original.info, 'execType');
            if (execType === 'Trade') {
                curCreated = await this.repository.addExecution(accountId, this.exchange.getExchangeName(), userInfo.holder, entry);
            } else {
                let fundingEntry = this.getFundingFeeExtendedLedgerEntry(entry);
                curCreated = await this.repository.addLedger(accountId, this.exchange.getExchangeName(), userInfo.holder, fundingEntry);
            }
            created = created | curCreated;
            lastTs = entry.timestamp;
        }

        if (lastTs != null) {
            await this.repository.setLastSyncEndpoint(accountId, 'trades', lastTs);
        }

        return created;
    }

    /**
     * 
     * @param {ExtendedLedgerEntry} entry 
     */
    getFeeExtendedLedgerEntry(entry) {
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
            newFOtherData: undefined,
            newFSubtype: null,
            newFSymbol: entry.newFSymbol,
            newFType: entry.newFType,
            newFWallet: entry.fee.currency,
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
     * @param {BaseExchangeCcxtTrade} entry 
     * @returns 
     */
    getFundingFeeExtendedLedgerEntry(entry) {
        /** @type {ExtendedLedgerEntry} */
        let newEntry = {
            account: this.exchange.ccxtExchange.safeString(entry.toJson().info, 'account'),
            after: undefined,
            amount: entry.feeCost,
            before: undefined,
            currency: entry.feeCurrency,
            datetime: entry.datetime,
            direction: undefined,
            fee: undefined,
            id: "funding-" + entry.id,
            info: entry.info,
            newFDescription: undefined,
            newFOrderId: undefined,
            newFSubtype: undefined,
            newFSymbol: entry.symbol,
            newFType: LedgerTypes.LEDGER_FEE_TYPE,
            newFSubtype: LedgerTypes.LEDGER_FUNDING_FEE_SUBTYPE,
            newFWallet: entry.feeCurrency,
            referenceAccount: undefined,
            referenceId: undefined,
            status: 'ok',
            timestamp: entry.timestamp,
            type: 'fee',
        }

        return newEntry;
    }
}

module.exports = { BitmexSync }