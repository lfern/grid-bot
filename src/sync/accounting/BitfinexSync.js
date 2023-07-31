const { BaseExchangeSync } = require("./BaseExchangeSync");
const models = require("../../../models");

/** @typedef {import("../../crypto/exchanges/BaseExchange").UserInfo} UserInfo */

class BitfinexSync extends BaseExchangeSync {
    async sync(accountId) {
        let userInfo = await this.exchange.userInfo();
        let created = await this.syncLedger(accountId, userInfo);
        let created2 = await this.syncTrades(accountId, userInfo);
        return created | created2;
    }

    /**
     * 
     * @param {string} accountId 
     * @param {UserInfo} userInfo 
     * @returns 
     */
    async syncLedger(accountId, userInfo) {
        let endpoint = await this.repository.getLastSyncEndpoint(accountId, 'ledger');
        let since = 1000;
        let end = undefined;
        let pendingData = false;
        let nextLastTs = since;
        if (endpoint != null){
            nextLastTs = Number(endpoint.last_ts);
            if (endpoint.pending_ts_start != null) {
                pendingData = true;
                since = endpoint.pending_ts_start;
                end = endpoint.pending_ts_end;
            } else {
                since = endpoint.last_ts;
            }
        }
        
        let limit = 2500;
        let entries = await this.exchange.fetchExtendedLedger(undefined, since, limit, {end});
        let created = false;

        let nextPendingStart = null;
        let nextPendingEnd = null;
        if (entries.length > 0) {
            if (!pendingData) {
                nextLastTs = entries[entries.length - 1].timestamp;
            }

            if (entries.length >= limit) {
                nextPendingStart = since;
                nextPendingEnd = entries[0].timestamp;
            }
        }
        console.log(`BitfinexSync: ${accountId} last ledger request response lenght: ${entries.length}`)
        for(let i=0;i<entries.length;i++) {
            let entry = entries[i];
            // hack account id
            entry.account = userInfo.id;
            let curCreated = await this.repository.addLedger(accountId, this.exchange.getExchangeName(), userInfo.holder, entry);
            created = created | curCreated;
            if (entry.fee != undefined) {
                let feeEntry = this.exchange.getFeeExtendedLedgerEntry(entry);
                if (feeEntry) {
                    curCreated = await this.repository.addLedger(accountId, this.exchange.getExchangeName(), userInfo.holder, feeEntry);
                    created = created | curCreated;
                }
            }
        }

        await this.repository.setLastSyncEndpoint(accountId, 'ledger', nextLastTs, nextPendingStart, nextPendingEnd);

        return created;
    }

    /**
     * 
     * @param {string} accountId 
     * @param {UserInfo} userInfo 
     * @returns 
     */
    async syncTrades(accountId, userInfo) {
        let lastTs = null;
        let endpoint = await this.repository.getLastSyncEndpoint(accountId, 'trades');
        let since = 1000;
        if (endpoint != null){
            since = endpoint.last_ts;
        }

        let limit = 2500;
        let entries = await this.exchange.fetchMyTrades(undefined, since, limit, {sort: 1});
        let created = false;
        console.log(`BitfinexSync: ${accountId} last trades request response lenght: ${entries.length}`)
        for(let i=0;i<entries.length;i++) {
            let entry = entries[i];
            // hack account id
            entry.account = userInfo.id;
            let curCreated = await this.repository.addExecution(accountId, this.exchange.getExchangeName(), userInfo.holder, entry);
            created = created | curCreated;
            lastTs = entry.timestamp;
        }

        if (lastTs != null) {
            await this.repository.setLastSyncEndpoint(accountId, 'trades', lastTs);
        }

        return created;
    }
}

module.exports = { BitfinexSync }