
class BaseExchangePosition {
    /**
     * Position size
     * @returns {number}
     */
    get contracts() {
        throw new Error("NOT IMPLEMENTED");
    }

    /**
     * @returns {object}
     */
    toJson() {
        throw new Error("NOT IMPLEMENTED");
    }
}

module.exports = { BaseExchangePosition }