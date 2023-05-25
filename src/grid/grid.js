const { BigNumber } = require("bignumber.js");
const _ = require('lodash');
const models = require('../../models');
const { InstanceAccountRepository } = require("../../repository/InstanceAccountingRepository");
const { PendingAccountRepository } = require("../../repository/PendingAccountRepository");

/** @typedef {import('../crypto/exchanges/BaseExchange').BaseExchange} BaseExchange */
/** @typedef {import('../crypto/exchanges/BaseExchangeOrder').BaseExchangeOrder} BaseExchangeOrder */


class GridManager {
    /**
     * 
     * @param {BaseExchange} exchange 
     * @param {*} strategy 
     * @param {*} currentPrice 
     */
    constructor(exchange, instanceId, strategy) {
        this.exchange = exchange;
        this.instanceId = instanceId;
        this.strategy = strategy;
        this.currentPosition = new BigNumber(strategy.initial_position);
        this.step = new BigNumber(strategy.step);
        this.orderQty = new BigNumber(strategy.order_qty);
        this.instanceAccRepository = new InstanceAccountRepository();
        this.pendingAccountRepository = new PendingAccountRepository();
    }

    _createGridEntry(level, gridId, side, active, currentPrice) {
        let symbol = this.strategy.symbol;
        let gridPrice;
        let diffPrice;
        
        if (this.strategy.step_type == 'percent') {
            diffPrice = currentPrice.multipliedBy(level).multipliedBy(this.step).dividedBy(100);
        } else {
            diffPrice = this.step.multipliedBy(level);
        }

        if (side == 'sell') {
            gridPrice = currentPrice.plus(diffPrice);
        } else {
            gridPrice = currentPrice.minus(diffPrice);
        }

        if (gridPrice <= 0) {
            throw new Error("Price negative in grid");
        }
    
        var cost = this.orderQty.multipliedBy(gridPrice);
            let gridPriceEntry = this.exchange.priceToPrecision(symbol, gridPrice.toFixed()); 
        let orderQtyEntry = this.exchange.amountToPrecision(symbol, this.orderQty.toFixed());
        let costEntry = this.exchange.priceToPrecision(symbol, cost.toFixed());
    
        let newGridEntry = {
            strategy_instance_id: this.instanceId,
            price: gridPriceEntry,
            buy_order_id: gridId,
            buy_order_qty: orderQtyEntry,
            buy_order_cost: costEntry,
            sell_order_id: gridId + 1,
            sell_order_qty: orderQtyEntry,
            sell_order_cost: costEntry,
        };
    
        if (active) {
            let position = this.currentPosition.plus(
                this.orderQty.multipliedBy(
                    side == 'sell' ? -(level-1) : level-1
                )
            );
    
            newGridEntry = _.extend(newGridEntry, {
                position_before_order: this.exchange.amountToPrecision(symbol, position.toFixed()),
                order_qty: orderQtyEntry,
                side: side,
                active: false,
                exchange_order_id: null,
            });
        }

        return newGridEntry;
    }

    createGridEntries(currentPrice) {
        let currentPriceBig = new BigNumber(currentPrice);
        let entries = [];
        entries.push(this._createGridEntry(
            0,
            this.strategy.sell_orders + 1,
            'buy',
            false,
            currentPriceBig
        ));

        for (let i=0; i < this.strategy.sell_orders; i++) {
            entries.push(this._createGridEntry(
                i+1,
                this.strategy.sell_orders - i,
                'sell',
                i < this.strategy.active_sells,
                currentPriceBig
            ));
        }

        for (let i=0; i < this.strategy.buy_orders; i++) {
            entries.push(this._createGridEntry(
                i+1,
                this.strategy.sell_orders + i + 2,
                'buy',
                i < this.strategy.active_buys,
                currentPriceBig
            ));
        }
        return entries;
    }

    async cancelOrders(orders) {
        for (let i=0;i<orders.length;i++) {
            await this.exchange.cancelOrder(orders[i],this.strategy.symbol);
        }
    }

    async createOrders(gridEntries) {
        let sells = gridEntries.filter(entry => entry.exchange_order_id == null && entry.active === false && entry.side == 'sell').sort((a,b) => a.price < a.price ? 1 : (a.price > a.price ? -1 : 0));
        let buys = gridEntries.filter(entry => entry.exchange_order_id == null && entry.active === false && entry.side == 'buy').sort((a,b) => a.price > a.price ? 1 : (a.price < a.price ? -1 : 0));
        let orders = _.compact(_.flatten(_.zip(sells, buys)));

        for (let i=0;i<orders.length;i++) {
            let gridOrder = orders[i];
            const order = await this.exchange.createOrder(
                this.strategy.symbol,
                'limit',
                gridOrder.side,
                gridOrder.order_qty,
                gridOrder.price
            );
            
            models.sequelize.transaction(async (transaction)=> {
                let result = await models.StrategyInstanceGrid.update({
                    active: true,
                    exchange_order_id: order.id,
                }, {
                    where: {
                        strategy_instance_id: this.instanceId,
                        active: false,
                        side: gridOrder.side,
                        buy_order_id: gridOrder.buy_order_id
                    },
                    transaction
                });

                await this.instanceAccRepository.createOrder(
                    this.instanceId,
                    this.strategy.account.id,
                    order,
                    transaction);

            });
        }
    }

    /**
     * @param {string} account
     * @param {BaseExchangeOrder} order 
     */
    async handleOrder(account, order) {

        // Only process closed orders for now
        if (order.status != 'closed') {
            await this.instanceAccRepository.updateOrder(this.strategy.account.id, order);
            return;
        }

        // Block grid
        let [gridEntries, canceledOrders, delayed] = await this._tryModifyGrid(order);
        // if delayed save pending
        if (delayed) {
            console.error(`Delaying order ${order.id}`);
            await this.pendingAccountRepository.addOrder(account, order, true);
            console.error(`After Delaying order ${order.id}`);
        } else {
            await this.createOrders(gridEntries);
            await this.cancelOrders(canceledOrders);
            await this.instanceAccRepository.updateOrder(this.strategy.account.id, order);
        }

    }
    
    async _tryModifyGrid(order) {
        let gridEntriesRaw = [];
        let canceledOrders = [];
        let delayed = false;
        await models.sequelize.transaction(async transaction => {
            // get all grid entries orderes by buy id
            let gridEntries = await models.StrategyInstanceGrid.findAll({
                where: {
                    strategy_instance_id: this.instanceId,
                },
                lock: transaction.LOCK.UPDATE,
                transaction,
                order: [
                    ['buy_order_id', 'ASC'],
                ]
            });
            // check grid data
            let indexOrder = -1;
            let allActives = true;
            let indexHigherBuy = -1;
            let indexLowerSell = -1;
            gridEntries.forEach((entry, index) => {
                if (entry.exchange_order_id == order.id) {
                    indexOrder = index;
                }

                if (indexHigherBuy == -1 && entry.side == 'buy') {
                    indexHigherBuy = index;
                }

                if (entry.side == 'sell') {
                    indexLowerSell = index;
                }

                if (entry.side != null) {
                    allActives = allActives && entry.active;
                }

            });

            // If grid is updating or order not in grid now, stop
            if (!allActives || indexOrder == -1) {
                delayed = !allActives;
                return;
            }

            if (order.side == 'buy') {
                if (indexHigherBuy != indexOrder) {
                    delayed = true;
                    console.error("buy order executed is not the higher buy in ther grid???");
                    return;
                }
                for(let i=indexHigherBuy; i <= indexOrder; i++) {
                    this._removeIndexFromGrid(gridEntries, i, canceledOrders);
                }
            } else {
                if (indexLowerSell != indexOrder) {
                    delayed = true;
                    console.error("sell order executed is not the lower sell in ther grid???");
                    return;
                }
                for(let i=indexLowerSell; i >= indexOrder; i--) {
                    this._removeIndexFromGrid(gridEntries, i, canceledOrders);
                }
            }

            for(let i=0;i<gridEntries.length;i++) {
                if (gridEntries[i].changed()) {
                    await gridEntries[i].save({transaction});
                }
            }
            gridEntriesRaw = gridEntries.map(x => x.get({ plain: true }));
            gridEntriesRaw.forEach(entry => {
                console.log(`${entry.buy_order_id}\t${entry.position_before_order}\t${entry.side}\t${entry.active}\t${entry.exchange_order_id}`);
            })
        });
        
        return [gridEntriesRaw, canceledOrders, delayed];
    }

    _removeIndexFromGrid(gridEntries, index, canceledOrders) {
        let executedEntry = gridEntries[index];
        let srcSide = executedEntry.side;
        let dstSide;
        let signIndex;
        let activeOrders;
        if (srcSide == 'buy') {
            dstSide = 'sell';
            signIndex = -1;
            activeOrders = this.strategy.active_sells;
        } else {
            dstSide = 'buy';
            signIndex = 1;
            activeOrders = this.strategy.active_buys;    
        }
        // insert other side entry
        let otherSideIndex = index + signIndex;
        if (otherSideIndex >= 0 && otherSideIndex < gridEntries.length) {
            this._createNextSideGridEntry(gridEntries[index], gridEntries[otherSideIndex], dstSide);
        }
        // insert +nth buy if posible
        let indexSideToAdd = index + activeOrders * (-signIndex);
        let indexSideFrom = indexSideToAdd + signIndex;
        if (indexSideToAdd >= 0 && indexSideToAdd < gridEntries.length &&
            indexSideFrom >= 0 && indexSideFrom < gridEntries.length) {
            this._createNextSideGridEntry(gridEntries[indexSideFrom], gridEntries[indexSideToAdd], srcSide);
        }
        // remove buy at index
        this._resetGridEntry(executedEntry);
        // remove -nth sell above if posible
        let indexSideToRemove = index + (activeOrders+1) * signIndex;
        if (indexSideToRemove >= 0 && indexSideToRemove < gridEntries.length) {
            const toRemoveEntry = gridEntries[indexSideToRemove];
            if (toRemoveEntry.exchange_order_id != null) {
                canceledOrders.push(toRemoveEntry.exchange_order_id);
            } else {
                console.error("Error last sell doesn't have order id");
            }
            this._resetGridEntry(toRemoveEntry);
        }
    }

    _createNextSideGridEntry(srcEntry, dstEntry, dstSide) {
        let lastPosition = new BigNumber(srcEntry.position_before_order);
        let lastOrderQty = new BigNumber(srcEntry.order_qty);
        if (srcEntry.side == 'buy') {
            dstEntry.position_before_order = this.exchange.amountToPrecision(
                this.strategy.symbol,
                lastPosition.plus(lastOrderQty).toFixed()
            );
        } else {
            dstEntry.position_before_order = this.exchange.amountToPrecision(
                this.strategy.symbol,
                lastPosition.minus(lastOrderQty).toFixed()
            );
        }

        if (dstSide == 'sell') {
            dstEntry.order_qty = this.exchange.priceToPrecision(
                this.strategy.symbol,
                dstEntry.sell_order_qty
            );

            dstEntry.side = dstSide;
            dstEntry.active = false;
            dstEntry.exchange_order_id = null;
        } else {
            dstEntry.order_qty = this.exchange.priceToPrecision(
                this.strategy.symbol,
                dstEntry.buy_order_qty
            );

            dstEntry.side = dstSide;
            dstEntry.active = false;
            dstEntry.exchange_order_id = null;
        }
    }

    _resetGridEntry(entry) {
        entry.position_before_order = null;
        entry.order_qty = null;
        entry.side = null;
        entry.active = null;
        entry.exchange_order_id = null;
    }
}

module.exports = {GridManager}