const models = require('../models');

class StrategyInstanceGridRepository {
    /**
     * Get next order from grid to be cancelled. It should be the closest
     * order to the current price in grid (gap)
     * @param {int} instanceId 
     */
    async getNextEntryToCancel(instanceId) {
        let gridEntries = await models.StrategyInstanceGrid.findAll({
            where: {
                strategy_instance_id: instanceId,
            },
            order: [
                ['buy_order_id', 'ASC'],
            ]
        });

        let buys = gridEntries.filter(x => x.side == 'buy');
        let sells = gridEntries.filter(x => x.side == 'sell').reverse();

        let buysToCancel = buys.filter(x => x.exchange_order_id != null);
        let sellsToCancel = sells.filter(x => x.exchange_order_id != null);

        let notCanceledFound = false;
        const findFirstNotCancelled = (x) => {
            let ret = !notCanceledFound && x.exchange_order_id == null;
            notCanceledFound = x.exchange_order_id != null;
            return ret;
        }
        let cancelledSells = sells.filter(findFirstNotCancelled).length;
        notCanceledFound = false;
        let cancelledBuys = buys.filter(findFirstNotCancelled).length;

        if ((buysToCancel.length == 0 || cancelledBuys > cancelledSells) && sellsToCancel.length > 0) {
            return sellsToCancel[0];
        } else if (buysToCancel.length > 0) {
            return buysToCancel[0];
        } else {
            return null;
        }
    }

    
}

module.exports = {
    StrategyInstanceGridRepository
}
