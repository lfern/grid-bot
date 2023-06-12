/** @typedef {import('bull').Queue} Queue */

class NullEventQueue {
    constructor(name) {
        this.logNotification = false;
        this.name = name;
    }

    async add(...params) {
        if (!this.logNotification) {
            console.log(`${this.name} Event Service is not initialized`);
            this.logNotification = true;
        }
    }
}

class EventService {
    constructor(name) {
        this.name = name;
        /** @type {Queue} */
        this.queue = new NullEventQueue(this.name);
        this.defaultOptions = {
            attempts: 0,
            removeOnComplete: true,
            removeOnFail: true,
        };
    }

    /**
     * 
     * @param {Queue} queue 
     */
    init(queue) {
        this.queue = queue;
    }
    
    _send(data) {
        this.queue.add(data, this.defaultOptions).then(res => {}).catch(ex => console.error(ex));
    }
}

module.exports = {
    NullEventQueue,
    EventService
}