class BaseThrottlerCache {
    getThrottler(hash) {
        throw new Error("NOT IMPLEMENTED");
    }
    
    setThrottler(hash, t) {
        throw new Error("NOT IMPLEMENTED");
    }

}

module.exports = {BaseThrottlerCache}