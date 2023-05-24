const { BigNumber } = require("bignumber.js");
const _ = require('lodash');
const models = require('../../models');

/** @typedef {import('../crypto/exchanges/BaseExchange').BaseExchange} BaseExchange */


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
        let currentPrice = new BigNumber(currentPrice);
        let entries = [];
        entries.push(this.createGridEntry(
            0,
            this.strategy.sell_orders + 1,
            'buy',
            false,
            currentPrice
        ));

        for (let i=0; i < this.strategy.sell_orders; i++) {
            entries.push(this.createGridEntry(
                i+1,
                this.strategy.sell_orders - i,
                'sell',
                i < this.strategy.active_sells,
                currentPrice
            ));
        }

        for (let i=0; i < this.strategy.buy_orders; i++) {
            entries.push(this.createGridEntry(
                i+1,
                this.strategy.sell_orders + i + 2,
                'buy',
                i < this.strategy.active_buys,
                currentPrice
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
}

module.exports = {GridManager}