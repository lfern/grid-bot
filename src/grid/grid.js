const { BigNumber } = require("bignumber.js");
const _ = require('lodash');
const models = require('../../models');
const { InstanceAccountRepository } = require("../../repository/InstanceAccountingRepository");
const { PendingAccountRepository } = require("../../repository/PendingAccountRepository");
const {StrategyInstanceEventRepository, LEVEL_WARN, LEVEL_CRITICAL} = require('../../repository/StrategyInstanceEventRepository');

/** @typedef {import('../crypto/exchanges/BaseExchange').BaseExchange} BaseExchange */
/** @typedef {import('../crypto/exchanges/BaseExchangeOrder').BaseExchangeOrder} BaseExchangeOrder */

/**
 * @typedef {Object} GridNewOrderAfterExecution
 * @property {number} price
 * @property {number} amount
 * @property {string} side
 * @property {string} motherOrderId
 */

/** 
 * @typedef {Object} GridEntryFixData
 * @property {Object[]} gridEntries,
 * @property {number | null} indexFound,
 * @property {string | null} sideFound,
 * @property {number | null} subIndexFound,
 * @property {GridNewOrderAfterExecution} newOrderData
 */
class GridManager {
    /**
     * 
     * @param {BaseExchange} exchange 
     * @param {*} isntance 
     * @param {*} strategy 
     */
    constructor(exchange, instance, strategy) {
        this.exchange = exchange;
        this.instance = instance;
        this.strategy = strategy;
        this.currentPosition = new BigNumber(strategy.initial_position);
        this.step = new BigNumber(strategy.step);
        this.orderQty = new BigNumber(strategy.order_qty);
        this.instanceAccRepository = new InstanceAccountRepository();
        this.pendingAccountRepository = new PendingAccountRepository();
        this.eventRepository = new StrategyInstanceEventRepository();
    }

    async getNextOrderToSend() {
        // get all grid entries orderes by buy id
        let gridEntries = await models.StrategyInstanceGrid.findAll({
            where: {
                strategy_instance_id: this.instance.id,
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
                console.log(`Pending order for grid ${this.instance.id}: buy order id ${order.buy_order_id} ${order.side} ${order.order_qty}`);
                return order;
            }
        }

        console.log("No pending order for grid", this.instance.id);
        return null;
    }

    async _createGridEntry(level, gridId, side, active, currentPrice, previousPosition) {
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
        let buyOrderQtyEntry = this.exchange.amountToPrecision(symbol, this.orderQty.toFixed());
        let costEntry = this.exchange.costToPrecision(symbol, cost.toFixed());
    
        let quantity = await models.StrategyQuantity.findOne({
            where: {
                strategy_id: this.strategy.id,
                id_buy: gridId,
            }
        });

        let sellOrderQtyEntry = buyOrderQtyEntry;
        if (quantity != null) {
            buyOrderQtyEntry = this.exchange.amountToPrecision(symbol, quantity.buy_order_qty);
            sellOrderQtyEntry = this.exchange.amountToPrecision(symbol, quantity.sell_order_qty);
        }

        let newGridEntry = {
            strategy_instance_id: this.instance.id,
            price: gridPriceEntry,
            buy_order_id: gridId,
            buy_order_qty: buyOrderQtyEntry,
            buy_order_cost: costEntry,
            sell_order_id: gridId + 1,
            sell_order_qty: sellOrderQtyEntry,
            sell_order_cost: costEntry,
        };
    
        if (active) {
            let thisOrderQty = side == 'sell' ? sellOrderQtyEntry : buyOrderQtyEntry;

            newGridEntry = _.extend(newGridEntry, {
                position_before_order: this.exchange.amountToPrecision2(symbol, previousPosition.toFixed()),
                order_qty: thisOrderQty,
                side: side,
                active: false,
                exchange_order_id: null,
                order_id: null,
                matching_order_id: null,
            });
        }

        return newGridEntry;
    }

    async createGridEntries(currentPrice) {
        let currentPriceBig = new BigNumber(currentPrice);
        let entries = [];
        let currentPosition = this.currentPosition;

        entries.push(await this._createGridEntry(
            0,
            this.strategy.sell_orders + 1,
            'buy',
            false,
            currentPriceBig,
            currentPosition,
        ));

        for (let i=0; i < this.strategy.sell_orders; i++) {
            let entry = await this._createGridEntry(
                i+1,
                this.strategy.sell_orders - i,
                'sell',
                i < this.strategy.active_sells,
                currentPriceBig,
                currentPosition,
            );
            entries.push(entry);
            currentPosition = currentPosition.minus(entry.order_qty != null ? entry.order_qty : 0);
        }

        currentPosition = this.currentPosition;
        for (let i=0; i < this.strategy.buy_orders; i++) {
            let entry = await this._createGridEntry(
                i+1,
                this.strategy.sell_orders + i + 2,
                'buy',
                i < this.strategy.active_buys,
                currentPriceBig,
                currentPosition
            );
            entries.push(entry);
            currentPosition = currentPosition.plus(entry.order_qty != null ? entry.order_qty : 0);
        }
        return entries;
    }

    async cancelOrders(orders) {
        for (let i=0;i<orders.length;i++) {
            console.log(`Canceling order ${orders[i]} ${this.strategy.symbol}`);
            try {
                await this.exchange.cancelOrder(orders[i],this.strategy.symbol);
            } catch (ex) {
                this.instance.running = false;
                this.instance.stopped_at = Date.now();
                await this.instance.update({running: this.instance.running, stopped_at: this.instance.stopped_at});
                await this.eventRepository.create(
                    this.instance,
                    'OrderCancelError',
                    LEVEL_CRITICAL,
                    `Couln't cancel order ${orders[i]}!!! Stopping grid instance: ${ex.message}`
                );

                return false;
            }
        }

        return true;
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
                        strategy_instance_id: this.instance.id,
                        active: false,
                        side: gridOrder.side,
                        buy_order_id: gridOrder.buy_order_id
                    },
                    transaction
                });

                await this.instanceAccRepository.createOrder(
                    this.instance.id,
                    this.strategy.account.id,
                    order,
                    transaction);

            });
        }
    }
*/

    /**
     * 
     * @param {boolean} dirty 
     * @param {BaseExchangeOrder} order 
     * @returns 
     */
    async setGridDirty(dirty, order) {
        /* remove stop grid
        let fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 3600); // five minutes ago
        if (dirty && this.instance.is_dirty && this.instance.dirty_at != null && this.instance.dirty_at.getTime() < fiveMinutesAgo) {
            this.instance.running = false;
            this.instance.stopped_at = Date.now();
            await this.instance.update({running: this.instance.running, stopped_at: this.instance.stopped_at});
            await this.eventRepository.create(
                this.instance, 'GridDirty',
                LEVEL_CRITICAL,
                `Grid dirty for more than 5 minutes. Stopping grid!!!`
                );
            return;
        }
        */

        if (this.instance.is_dirty != dirty) {
            this.instance.is_dirty = dirty;
            this.instance.dirty_at = dirty? new Date() : null;
            await this.instance.update({
                is_dirty: this.instance.is_dirty,
                dirty_at: this.instance.dirty_at
            });

            if (dirty) {
                console.log(`Grid dirty, order ${order.id} is not lowest buy or highest sell`);
                await this.eventRepository.create(
                    this.instance,
                    'GridDirty',
                    LEVEL_WARN,
                    `Grid dirty, we handled an order that is not the highest buy or the lowest sell!!!. order Info:\n` +
                    `${order.id} ${order.side} ${order.symbol}`
                );
            } else {
                await this.eventRepository.create(
                    this.instance,
                    'GridClean',
                    LEVEL_WARN,
                    `Grid clean, we handled order: \n`+
                    `${order.id} ${order.side} ${order.symbol}`
                );
            }
        }
    }

    /**
     * @typedef {Object} GridHandledOrderStatus
     * @property {boolean} gridDirty - grid dirty
     * @property {boolean} delayed - order delayed (not in grid now)
     * @property {boolean} gridUpdated - 
     */

    /**
     * @param {BaseExchangeOrder} order 
     * @return {GridHandledOrderStatus}
     */
    async handleOrder(order, delayedOrder) {
        // Only process closed orders for now
        if (order.status != 'closed') {
            await this.instanceAccRepository.updateOrder(this.strategy.account.id, order);
            await this.pendingAccountRepository.removeOrder(this.strategy.account.id, order);
            return {
                delayed: false,
                gridDirty: false,
                gridUpdated: false,
            };
        }
        
        // Block grid
        let ret = await this._tryModifyGrid(order);
        ret.gridUpdated = false;

        if (ret.gridDirty) {
            return ret;
        }

        // if delayed means this order is not in grid now
        if (ret.delayed) {
            // check if order is still processed
            let orderInDb = this.instanceAccRepository.getOrder(this.strategy.account.id, order);
            if (orderInDb.status == 'closed') {
                // still processed
                console.log(`Order ${order.id} seems to be processed in ${this.instance.id}, so remove from pending`);
                await this.pendingAccountRepository.removeOrder(this.strategy.account.id, order);
                ret.delayed = false;
            }

            return ret;
        } else {
            ret.gridUpdated = true;
            // order has been processed now or still processed, so update and remove from pending
            await this.instanceAccRepository.updateOrder(this.strategy.account.id, order);
            await this.pendingAccountRepository.removeOrder(this.strategy.account.id, order);
            return ret;
        }

    }

    async _tryModifyGrid(order) {
        let ret = {
            gridDirty: false,
            delayed: false,
        };
        // grid is locked so don't need lock in db
        // get all grid entries orderes by buy id
        let gridEntries = await models.StrategyInstanceGrid.findAll({
            where: {
                strategy_instance_id: this.instance.id,
            },
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
            ret.delayed = !allActives;
            return ret;
        }

        let canceledOrders = [];
        if (order.side == 'buy') {
            if (indexHigherBuy != indexOrder) {
                console.error("buy order executed is not the higher buy in ther grid???");
                ret.gridDirty = true;
                return ret;
            }

            this._printGrid(gridEntries.map(x => x.get({ plain: true })));

            for(let i=indexHigherBuy; i <= indexOrder; i++) {
                this._removeIndexFromGrid(gridEntries, i, canceledOrders);
            }
        } else {
            if (indexLowerSell != indexOrder) {
                console.error("sell order executed is not the lower sell in ther grid???");
                ret.gridDirty = true;
                return ret;
            }

            this._printGrid(gridEntries.map(x => x.get({ plain: true })));

            for(let i=indexLowerSell; i >= indexOrder; i--) {
                this._removeIndexFromGrid(gridEntries, i, canceledOrders);
            }
        }

        // cancel orders removed from grid
        if (!await this.cancelOrders(canceledOrders)){
            ret.gridDirty = true;
            return ret;
        }
        // if everything is ok save to database
        for(let i=0;i<gridEntries.length;i++) {
            if (gridEntries[i].changed()) {
                await gridEntries[i].save();
            }
        }
    
        this._printGrid(gridEntries.map(x => x.get({ plain: true })));
        
        return ret;
    }

    _printGrid(gridEntriesRaw) {
        gridEntriesRaw.forEach(entry => {
            console.log(`${entry.buy_order_id}\t${entry.position_before_order}\t${entry.side}\t\
${entry.active}\t${entry.order_qty}\t${entry.exchange_order_id}\t${entry.order_id}\t${entry.matching_order_id}`);
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
            let otherSide = gridEntries[index].matching_order_id == null;
            this._createNextSideGridEntry(gridEntries[index], gridEntries[otherSideIndex], dstSide, otherSide);
        }
        // insert +nth buy if posible
        let indexSideToAdd = index + activeOrders * (-signIndex);
        let indexSideFrom = indexSideToAdd + signIndex;
        if (indexSideToAdd >= 0 && indexSideToAdd < gridEntries.length &&
            indexSideFrom >= 0 && indexSideFrom < gridEntries.length) {
            this._createNextSideGridEntry(gridEntries[indexSideFrom], gridEntries[indexSideToAdd], srcSide, false);
        }
        // remove buy at index
        this._resetGridEntry(executedEntry, false);
        // remove -nth sell above if posible
        let indexSideToRemove = index + (activeOrders+1) * signIndex;
        if (indexSideToRemove >= 0 && indexSideToRemove < gridEntries.length) {
            const toRemoveEntry = gridEntries[indexSideToRemove];
            if (toRemoveEntry.exchange_order_id != null) {
                canceledOrders.push(toRemoveEntry.exchange_order_id);
            } else {
                console.error("Error last sell doesn't have order id");
            }
            this._resetGridEntry(toRemoveEntry, true);
        }
    }

    _createNextSideGridEntry(srcEntry, dstEntry, dstSide, otherSide) {
        let lastPosition = new BigNumber(srcEntry.position_before_order);
        let lastOrderQty = new BigNumber(srcEntry.order_qty);
        let nextOrderQty;
        if (!otherSide) {
            // if not other side (we are adding and order to complete the active orders)
            if (dstEntry.matching_order_id != null) {
                if (dstEntry.order_qty == null) {
                    console.error("Something wrong. Found emptru order_qty when placing a other side order!!!");
                }

                // if there were a matching_order_id (and should have a order_qty from a cancelled
                // order matched from mother order) we recover it
                nextOrderQty = dstEntry.order_qty;
            } else {
                // else new order
                if (srcEntry.side == 'buy') {
                    nextOrderQty = dstEntry.buy_order_qty;
                } else {
                    nextOrderQty = dstEntry.sell_order_qty;
                }
            }
        } else {
            // new order 
            if (dstEntry.matching_order_id != null) {
                console.error("Something wrong. Found matching_order_id when placing a new order!!!");
            }

            nextOrderQty = srcEntry.order_qty;
            dstEntry.order_id = null;
            dstEntry.matching_order_id = srcEntry.order_id;
        }

        if (srcEntry.side == 'buy') {
            dstEntry.position_before_order = this.exchange.amountToPrecision2(
                this.strategy.symbol,
                lastPosition.plus(lastOrderQty).toFixed()
            );
        } else {
            dstEntry.position_before_order = this.exchange.amountToPrecision2(
                this.strategy.symbol,
                lastPosition.minus(lastOrderQty).toFixed()
            );
        }

        if (dstSide == 'sell') {
            dstEntry.order_qty = this.exchange.amountToPrecision(
                this.strategy.symbol,
                nextOrderQty//dstEntry.sell_order_qty
            );

            dstEntry.side = dstSide;
            dstEntry.active = false;
            dstEntry.exchange_order_id = null;
        } else {
            dstEntry.order_qty = this.exchange.amountToPrecision(
                this.strategy.symbol,
                nextOrderQty//dstEntry.buy_order_qty
            );

            dstEntry.side = dstSide;
            dstEntry.active = false;
            dstEntry.exchange_order_id = null;
        }
    }

    _resetGridEntry(entry, isCancel) {
        entry.position_before_order = null;
        entry.side = null;
        entry.active = null;
        entry.exchange_order_id = null;
        entry.order_id = null;
        if (!isCancel) {
            // preserve this
            entry.order_qty = null;
            entry.filled = null;
            entry.matching_order_id = null;
        } else {
            if (entry.matching_order_id == null) {
                entry.order_qty = null;
            }
        }
    }

    async _getGridEntries() {
        // search order in current grid or recovery table
        let entries = await models.StrategyInstanceGrid.findAll({
            where: {
                id: this.instance.id,
            },
            include: [models.StrategyInstanceGrid.StrategyInstanceRecoveryGrid],
            order: [
                ['buy_order_id', 'ASC'],
            ]
        });

        this._printGrid(entries);

        return entries;


    }

    /**
     * 
     * @param {BaseExchangeOrder} order 
     * @return {GridEntryFixData}
     */
    async _getGridEntriesAndFindOrder(order) {
        let gridEntries = await this._getGridEntries();

        // search for order
        let indexFound = null;
        let sideFound = null;
        let motherOrderId = null;
        let subIndexFound = null;
        for (let i=0;i<gridEntries.length;i++) {
            let gridEntry = gridEntries[i];
            if (gridEntry.exchange_order_id == order.id) {
                indexFound = i;
                sideFound = gridEntry.side;
                motherOrderId = gridEntry.matching_order_id == null ? gridEntry.order_id : null;
                break;
            } else {
                for (let j=0;j<gridEntry.recovery_grids.length;j++) {
                    let recoverGrid = gridEntry.recovery_grids[j];
                    if (recoveryGrid.exchange_order_id == order.id) {
                        indexFound = i;
                        subIndexFound = j;
                        sideFound = recoverGrid.side;
                        motherOrderId = recoverGrid.matching_order_id == null ? gridEntry.order_id : null;
                        break;
                    }
                }
            }
        }

        let newOrderData = null;
        if (indexFound != null) {
            if (sideFound == 'buy') {
                if (indexFound > 0) {
                    let previousGridEntry = gridEntries[indexFound - 1];
                    newOrderData = {
                        price: previousGridEntry.price,
                        amount: previousGridEntry.sell_order_qty,
                        side: 'sell',
                        index: indexFound - 1,
                        motherOrderId: motherOrderId
                    };
                }
            } else {
                if (indexFound < gridEntries.length - 1) {

                    let nextGridEntry = gridEntries[indexFound + 1];
                    newOrderData = {
                        price: this.exchange.priceToPrecision(
                            this.strategy.symbol,
                            nextGridEntry.price
                        ),
                        amount:  this.exchange.amountToPrecision(
                            this.strategy.symbol,
                            nextGridEntry.buy_order_qty
                        ),
                        side: 'buy',
                        index: indexFound + 1,
                        motherOrderId: motherOrderId
                    };
                }
            }
        }

        return {
            gridEntries,
            indexFound,
            sideFound,
            subIndexFound,
            newOrderData
        };
    }

    /**
     * 
     * @param {BaseExchangeOrder} order 
     * @return {GridNewOrderAfterExecution|null}
     */
    async getOtherOrderAfterExecuteOrder(order) {
        let result = this._getGridEntriesAndFindOrder(order);
        return result.newOrderData;
    }

    /**
     * 
     * @param {BaseExchangeOrder} executedOrder 
     * @param {BaseExchangeOrder} createdOrder 
     */
    async commitOrderExecution(executedOrder, createdOrder) {
        // TODO: review this process
        let result = this._getGridEntriesAndFindOrder(executedOrder);
        if (result.newOrderData != null) {
            await models.sequelize.transaction(async (transaction) => {
                await this.instanceAccRepository.updateOrder(this.strategy.account.id, executedOrder);
                let newDbOrder = await this.instanceAccRepository.createOrder(this.strategy.account.id, createdOrder,  result.newOrderData.motherOrderId);
    
                let newEntry = gridEntries[result.newOrderData.index];
                let oldEntry = gridEntries[result.indexFound];
                let lastPosition = new BigNumber(oldEntry.position_before_order);
                let lastOrderQty = new BigNumber(oldEntry.order_qty);
                // create new
                if (newEntry.active == null) {
                    newEntry.position_before_order = this.exchange.amountToPrecision2(
                        this.strategy.symbol,
                        oldEntry.side == 'buy' ? lastPosition.plus(lastOrderQty).toFixed() : lastPosition.minus(lastOrderQty).toFixed(),
                    );
                    newEntry.order_qty = result.newOrderData.amount;
                    newEntry.side = result.newOrderData.side;
                    newEntry.active = true;
                    newEntry.filled = null;
                    newEntry.exchange_order_id = createdOrder.id;
                    newEntry.order_id = newDbOrder.id;
                    newEntry.matching_order_id = result.newOrderData.motherOrderId;
                    await newEntry.save({transaction});
                } else {
                    await models.StrategyInstanceRecoveryGrid.create({
                        strategy_instance_grid_id: this.instance.id, 
                        order_qty: result.newOrderData.amount,
                        side: result.newOrderData.side,
                        exchange_order_id: createdOrder.id,
                        filled: null,
                        order_id: newDbOrder.id,
                        matching_order_id: result.newOrderData.motherOrderId,
                    }, {transaction});
                }

                // remove old
                if (result.subIndexFound == null) {
                    // remove entry from main table
                    if (oldEntry.recovery_grids.length == 0) {
                        this._resetGridEntry(oldEntry, false);
                        await oldEntry.save({transaction});
                    } else {
                        let firstRecovery = oldEntry.recovery_grids[0];
                        oldEntry.order_qty = firstRecovery.order_qty;
                        oldEntry.side = firstRecovery.side;
                        oldEntry.active = true;
                        oldEntry.filled = firstRecovery.filled;
                        oldEntry.exchange_order_id = firstRecovery.exchange_order_id;
                        oldEntry.order_id = firstRecovery.order_id;
                        oldEntry.matching_order_id = firstRecovery.matching_order_id;
                        await oldEntry.save({transaction});
                        await firstRecovery.destroy({transaction});
                    }
                } else {
                    // remove auxiliary table
                    await oldEntry.recovery_grids[result.subIndexFound].destroy({transaction});
                }
        
            });

            return true;
        } else {
            return false;
        }
    }

    async checkClean() {
        let gridEntries = await this._getGridEntries();
        let currentExpectedSides = ['buy', null];
        let lastSide = null;
        let buys = 0;
        let sells = 0;
        // check only one gap between buys and sells
        for(let i=0;i<gridEntries.length;i++) {
            let entry = gridEntries[i];
            if (entry.recovery_grids.length != 0) {
                let error = `Invalid grid ${this.instance.id}, there are duplicated orders in grid at index ${i}`;
                console.log(error);
                this._printGrid(gridEntries);
                return {ok: false, error};
            }
        
            if (!currentExpectedSides.includes(entry.side)) {
                let error = `Invalid grid ${this.instance.id}, expected ${','.join(currentExpectedSides)} found ${entry.side} (index ${i})`;
                console.log(error);
                this._printGrid(gridEntries);
                return {ok: false, error};
            }

            if (entry.side == null && lastSide == 'buy') {
                // here comes the gap
                currentExpectedSides = ['sell', null];
            } else if (entry.side == null && lastSide == 'sell') {
                currentExpectedSides = [null];
            } else if (entry.side != lastSide) {
                let error = `Invalid grid ${this.instance.id}, expected ${lastSide} found ${entry.side} (index ${i})`;
                console.log(error);
                this._printGrid(gridEntries);
                return {ok: false, error};
            }

            if (entry.side == 'buy') {
                buys = buys + 1;
            }

            if (entry.side == 'sell') {
                sells = sells + 1;
            }

            lastSide = entry.side;
        }

        if (buys != this.strategy.active_buys) {
            let error = `Invalid grid ${this.instance.id}, expected ${this.strategy.active_buys} active buys but ${buys} found`;
            console.log(error);
            this._printGrid(gridEntries);
            return {ok: false, error};
        }

        if (sells != this.strategy.active_sells) {
            let error = `CheckGridClean: not valid grid ${this.instance.id}, expected ${this.strategy.active_sells} active sells but ${sells} found`;
            console.log(error);
            this._printGrid(gridEntries);
            return {ok: false, error};
        }

        return {ok: true}
    }
}

module.exports = {GridManager}