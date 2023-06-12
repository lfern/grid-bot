const Redlock = require("redlock");

class NullRedlock {
    async acquire(...data) {
        throw new Error("Lock Service is not initialized");
    }
}


class LockService {
    constructor() {
        /** @type {Redlock} */
        this.redlock = new NullRedlock();
    }

    /**
     * 
     * @param {Redlock} redlock 
     */
    init(redlock) {
        this.redlock = redlock;
    }
    
    /**
     * 
     * @param {string|string[]} resource 
     * @param {number} ttl 
     * @returns 
     */
    async acquire(resource, ttl) {
        return await this.redlock.acquire(resource, ttl);
    }
}

const lockService = new LockService();

module.exports = lockService;
