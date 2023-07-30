const models = require('../models');
const { LedgerTypes } = require('../src/crypto/exchanges/BaseExchange');
const { BaseExchangeTrade } = require('../src/crypto/exchanges/BaseExchangeTrade');
const { InstanceAccountRepository } = require('./InstanceAccountingRepository');

/** @typedef {import('../src/crypto/exchanges/BaseExchange').ExtendedLedgerEntry} ExtendedLedgerEntry */

class AccountSyncRepository {
    async getNextAccountToSync() {
        const exchanges = await models.Account.findAll({
            attributes: ["exchange_id", models.Sequelize.literal("max(synced_at)")],
            group: "exchange_id",
            having: models.Sequelize.literal("max(synced_at) is null or max(synced_at) < now() - (interval '1 minute')"),
            order: [
                [models.Sequelize.literal("max(synced_at)"), 'ASC']
            ]
        });

        if (exchanges.length == 0) {
            return null;
        }

        let account = await models.Account.findOne({
            where: {
                exchange_id: exchanges.map(x => x.exchange_id),
                [models.Sequelize.Op.or]: [
                    {synced_at: {
                        [models.Sequelize.Op.eq]: null,
                    }},
                    {synced_at: {
                        [models.Sequelize.Op.lt] : models.Sequelize.literal("now() - (interval '1 minute')"),
                    }}
                ],
            },
            include: [models.Account.Exchange, models.Account.AccountType],
            order: [
                ['synced_at', 'ASC NULLS FIRST']
            ]
        });

        if (account != null) {
            account.synced_at = models.Sequelize.fn('NOW');
            await account.save();
        }
          
        return account;
    }


    async setLastSyncEndpoint(accountId, endpoint, ts, pendingTsStart = undefined, pendingTsEnd = undefined) {
        models.sequelize.transaction(async (transaction) => {
            const [row, created] = await models.AccountSyncEndpoint.findOrCreate({
                where: {
                    account_id: accountId,
                    endpoint: endpoint
                },
                defaults: {
                    account_id: accountId,
                    endpoint: endpoint,
                    last_ts: ts,
                    last_timestamp: ts,
                    pending_ts_start: pendingTsStart == undefined ? null: pendingTsStart,
                    pending_ts_end: pendingTsEnd == undefined ? null : pendingTsEnd,
                }
            });

            if (!created) {
                row.last_ts = ts;
                row.last_timestamp = ts;
                row.pending_ts_start = pendingTsStart == undefined ? null: pendingTsStart;
                row.pending_ts_end = pendingTsEnd == undefined ? null : pendingTsEnd;
            
                await row.save({transaction});
            }
        });
    }

    async getLastSyncEndpoint(accountId, endpoint) {
        return await models.AccountSyncEndpoint.findOne({
            where: {
                account_id: accountId,
                endpoint: endpoint 
            }
        })
    }

    /**
     * 
     * @param {string} accountId 
     * @param {BaseExchangeTrade} trade 
     */
    async addExecution(accountId, exchangeTag, exchangeHolder, trade) {
        let instanceAccountRepository = new InstanceAccountRepository();

        let order = await instanceAccountRepository.getOrderSymbol(accountId, trade.symbol, trade.order, true);
        let matchedOrderId = null;
        let instanceTag = null;
        if (order != null) {
            instanceTag = order.strategy_instance.createdAt.toISOString() + "-" + order.strategy_instance_id;
            if (order.matching_order_id != null) {
                let matchedOrder = await instanceAccountRepository.getOrderById( order.matching_order_id);
                if (matchedOrder != null) {
                    matchedOrderId = matchedOrder.exchange_order_id;
                }
            } 
        }

        const [row, created] = await models.AccountExecution.findOrCreate({
            where: {
                account_id: accountId,
                exchange_trade_id: trade.id,
            },
            defaults: {
                account_id: accountId,
                exchange: exchangeTag,
                exchange_holder: exchangeHolder,
                exchange_account: trade.account,
                wallet: trade.wallet,
                symbol: trade.symbol,
                exchange_order_id: trade.order,
                exchange_trade_id: trade.id,
                ts: trade.timestamp,
                timestamp: trade.timestamp,
                datetime: trade.datetime,
                price: trade.price,
                amount: trade.amount,
                cost: trade.cost,
                fee_cost: trade.feeCost,
                fee_coin: trade.feeCurrency,
                matched_exchange_order_id: matchedOrderId,
                instance_tag: instanceTag
            }
        });

        return created;
    }

    /**
     * 
     * @param {string} accountId 
     * @param {ExtendedLedgerEntry} ledger 
     */
    async addLedger(accountId, exchangeTag, exchangeHolder, ledger) {
        const [row, created] = await models.AccountLedger.findOrCreate({
            where: {
                account_id: accountId,
                exchange_txid: ledger.id,
            },
            defaults: {
                account_id: accountId,   
                exchange: exchangeTag,
                exchange_holder: exchangeHolder ? exchangeHolder : ledger.newFHolder,
                exchange_account: ledger.account,    
                wallet: ledger.newFWallet,
                exchange_txid: ledger.id,
                order_id: ledger.newFOrderId,
                related_id: ledger.referenceId,
                symbol: ledger.newFSymbol,
                asset: ledger.currency,
                tx_ts: ledger.timestamp,
                tx_timestamp: ledger.timestamp,
                tx_datetime: ledger.datetime,
                tx_type: ledger.newFType,
                tx_subtype: ledger.newFSubtype,
                amount: ledger.amount,
                amount_change: ledger.newFAmountChange ? ledger.newFAmountChange : 0,
                balance: ledger.after ? ledger.after : 0,
                description: ledger.newFDescription,
                status: ledger.status,
                other_data: ledger.newFOtherData,
            }
        });

        return created;
        
    }
}

module.exports = {AccountSyncRepository}