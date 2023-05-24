const { BigNumber } = require("bignumber.js");
const _ = require('lodash');
const models = require('../../models');

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
    }

    createGridEntry(level, gridId, side, active, currentPrice) {
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
        entries.push(this.createGridEntry(
            0,
            this.strategy.sell_orders + 1,
            'buy',
            false,
            currentPriceBig
        ));

        for (let i=0; i < this.strategy.sell_orders; i++) {
            entries.push(this.createGridEntry(
                i+1,
                this.strategy.sell_orders - i,
                'sell',
                i < this.strategy.active_sells,
                currentPriceBig
            ));
        }

        for (let i=0; i < this.strategy.buy_orders; i++) {
            entries.push(this.createGridEntry(
                i+1,
                this.strategy.sell_orders + i + 2,
                'buy',
                i < this.strategy.active_buys,
                currentPriceBig
            ));
        }
        return entries;
    }

    async createInitialOrders(gridEntries) {
        let sells = gridEntries.filter(entry => entry.side == 'sell').sort((a,b) => a.price < a.price ? 1 : (a.price > a.price ? -1 : 0));
        let buys = gridEntries.filter(entry => entry.side == 'buy').sort((a,b) => a.price > a.price ? 1 : (a.price < a.price ? -1 : 0));
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
            // check if any order is executed
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
            });
            console.log(result);
            console.log(order);

            await models.StrategyInstanceOrder.create({
                strategy_instance_id: this.instanceId,
                account_id: this.strategy.account_id,
                exchange_order_id: order.id,
                symbol: order.symbol,
                order_type: order.type,
                side: order.side,
                timestamp: order.timestamp,
                datetime: order.datetime,
                status: order.status,
                price: order.price,
                amount: order.amount,
                cost: order.cost,
                average: order.average,
                filled: order.filled,
                remaining: order.remaining,
            })
        }
    }

    /**
     * 
     * @param {BaseExchangeOrder} order 
     */
    async handleOrder(order) {

        if (order.status == 'closed') {

            await models.sequelize.transaction(async transaction => {
                // check if order exists in db
                let gridEntry = await models.StrategyInstanceGrid.findOne({
                    where: {
                        strategy_instance_id: this.instanceId,
                        exchange_order_id: order.id,
                    },
                    lock: transaction.LOCK.UPDATE,
                    transaction
                });

                if (gridEntry == null) {
                    console.log(`Grid entry not found for order ${order.id} for instance ${this.instanceId}`);
                    return;
                }

                let newSide;
                let newGridId;
                let newPosition;
                let newGridWhere;
                if (gridEntry.side == 'sell') {
                    newSide = 'buy';
                    newGridId = gridEntry.sell_order_id;
                    newPosition = new BigNumber(gridEntry.position_before_order).plus(new BigNumber(gridEntry.order_qty));
                    newGridWhere = {
                        strategy_instance_id: this.instanceId,
                        buy_order_id: gridEntry.sell_order_id
                    };
                } else {
                    newSide = 'sell';
                    newGridId = gridEntry.buy_order_id
                    newPosition = new BigNumber(gridEntry.position_before_order).minus(new BigNumber(gridEntry.order_qty));
                    newGridWhere = {
                        strategy_instance_id: this.instanceId,
                        sell_order_id: gridEntry.buy_order_id
                    };

                }
                let newGridEntry = await models.StrategyInstanceGrid.findOne({
                    where: newGridWhere,
                    lock: transaction.LOCK.UPDATE,
                    transaction
                });

                if (newGridEntry == null) {
                    console.log(`No new ${newSide} grid entry for grid id ${newGridId}`);
                    return;
                }

                newGridEntry.position_before_order = this.exchange.amountToPrecision(this.strategy.symbol, newPosition.toFixed());
                newGridEntry.order_qty = this.exchange.priceToPrecision(this.strategy.symbol, newSide ==  'buy' ? newGridEntry.buy_order_qty : newGridEntry.sell_order_qty);
                newGridEntry.side = newSide;
                newGridEntry.active = false;
                newGridEntry.exchange_order_id = null;
                await newGridEntry.save({transaction});

                gridEntry.position_before_order = null;
                gridEntry.order_qty = null;
                gridEntry.side = null;
                gridEntry.active = null;
                gridEntry.exchange_order_id = null;
                await gridEntry.save({transaction});

            });
        }
    }
}

module.exports = {GridManager}