const { InstanceRepository } = require('../repository/InstanceRepository');
const { LEVEL_WARN } = require('../repository/StrategyInstanceEventRepository');
const {NotificationEventService, SCOPE_OTHER} = require('./services/NotificationEventService');
const OrderSenderEventService = require('./services/OrderSenderEventService');

const instanceRepository = new InstanceRepository();

const tradingServiceBootstrap = async function () {
    try {
        NotificationEventService.send(
            'TradingServiceStarted',
            LEVEL_WARN,
            'Trading service initialized or reinitialized',
            { scope: SCOPE_OTHER}
        );
        
        let pendingOrderGrids = await instanceRepository.getPendingSendOrdersRuningInstances();
        for (let i=0;i<pendingOrderGrids.length;i++) {
            let instance = pendingOrderGrids[i];
            console.log(`Bootstrap: Sending order sender event for grid ${instance.id}`);
            OrderSenderEventService.send(instance.id);
        }    
    } catch (ex) {
        console.error(ex);
    }
}

const eventsWatcherBootstrap = async function() {
    try {
        NotificationEventService.send(
            'EventsWatcherStarted',
            LEVEL_WARN,
            'Events Watcher service initialized or reinitialized',
            {scope: SCOPE_OTHER}
        );
    } catch (ex) {
        console.error(ex);
    }
}

const notificationServicerBootstrap = async function() {
    try {
        NotificationEventService.send(
            'NotificationServiceStarted',
            LEVEL_WARN,
            'Notification service initialized or reinitialized',
            {scope: SCOPE_OTHER}
        );
    } catch (ex) {
        console.error(ex);
    }
}

module.exports = {
    tradingServiceBootstrap,
    eventsWatcherBootstrap,
    notificationServicerBootstrap
}