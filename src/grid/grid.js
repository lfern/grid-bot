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

    async getNextOrderToSend() {
        // get all grid entries orderes by buy id
        let gridEntries = await models.StrategyInstanceGrid.findAll({
            where: {
                strategy_instance_id: this.instanceId,
            },
            order: [
                ['buy_order_id', 'ASC'],
            ]
        });

        let pendingOrders = gridEntries.filter(x => x.active != null);
        let buys = pendingOrders.filter(x => x.side == 'buy');
        let sells = pendingOrders.filter(x => x.side == 'sell').reverse();
        let orders = _.compact(_.flatten(_.zip(sells, buys)));
        for(let i=0; i<orders.length;i++) {
            let order = orders[i];
            if (order.exchange_order_id == null) {
                console.log(`Pending order for grid ${this.instanceId}: buy order id ${order.buy_order_id} ${order.side} ${order.order_qty}`);
                return order;
            }
        }

        console.log("No pending order for grid", this.instanceId);
        return null;
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
            console.log(`Canceling order ${orders[i]} ${this.strategy.symbol}`);
            await this.exchange.cancelOrder(orders[i],this.strategy.symbol);
        }
    }
/*
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
            
            await models.sequelize.transaction(async (transaction)=> {
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
*/
    /**
     * @param {BaseExchangeOrder} order 
     */
    async handleOrder(order, delayedOrder) {
        // Only process closed orders for now
        if (order.status != 'closed') {
            await this.instanceAccRepository.updateOrder(this.strategy.account.id, order);
            await this.pendingAccountRepository.removeOrder(this.strategy.account.id, order);
            return null;
        }
        
        // TODO: check if there is a pending order in the grid with lower createdAt 

        // Block grid
        let [gridEntries, canceledOrders, delayed] = await this._tryModifyGrid(order);
        // if delayed means this order is not in grid now
        if (delayed) {
            // check if order is still processed
            let orderInDb = this.instanceAccRepository.getOrder(this.strategy.account.id, order);
            if (orderInDb.status == 'closed') {
                // still processed
                console.log(`Order ${order.id} seems to be processed in ${this.instanceId}, so remove from pending`);
                await this.pendingAccountRepository.removeOrder(this.strategy.account.id, order);
            }
            return null;
        } else {
            // order has been processed now or still processed, so update and remove from pending
            await this.instanceAccRepository.updateOrder(this.strategy.account.id, order);
            await this.pendingAccountRepository.removeOrder(this.strategy.account.id, order);
            // cancel orders removed from grid
            await this.cancelOrders(canceledOrders);
            return order;
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
            // TODO: not need all actives...
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

            // If order not in grid now, stop
            if (/*!allActives || */indexOrder == -1) {
                // if all actives then this order is processed before  
                delayed = !allActives;
                return;
            }

            if (order.side == 'buy') {
                if (indexHigherBuy != indexOrder) {
                    delayed = true;
                    console.error("buy order executed is not the higher buy in ther grid???");
                    return;
                }

                this._printGrid(gridEntries.map(x => x.get({ plain: true })));

                for(let i=indexHigherBuy; i <= indexOrder; i++) {
                    this._removeIndexFromGrid(gridEntries, i, canceledOrders);
                }
            } else {
                if (indexLowerSell != indexOrder) {
                    delayed = true;
                    console.error("sell order executed is not the lower sell in ther grid???");
                    return;
                }

                this._printGrid(gridEntries.map(x => x.get({ plain: true })));

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
            this._printGrid(gridEntriesRaw);
        });
        
        return [gridEntriesRaw, canceledOrders, delayed];
    }

    _printGrid(gridEntriesRaw) {
        gridEntriesRaw.forEach(entry => {
            console.log(`${entry.buy_order_id}\t${entry.position_before_order}\t${entry.side}\t${entry.active}\t${entry.exchange_order_id}`);
        })

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