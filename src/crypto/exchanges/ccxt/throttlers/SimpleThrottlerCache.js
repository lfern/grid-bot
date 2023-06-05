const { BaseThrottlerCache } = require("./BaseThrottlerCache");

class SimpleThrottlerCache extends BaseThrottlerCache {
    constructor() {
        super();
        this.cache = {};
    }

    getThrottler(hash) {
        return this.cache[hash];
    }
    
    setThrottler(hash, t) {
        this.cache[hash] = t;
    }

}

module.exports = {SimpleThrottlerCache}