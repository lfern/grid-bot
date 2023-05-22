const {BaseExchangePosition} = require('../BaseExchangePosition');
const ccxt = require('ccxt');

class BaseExchangeCcxtPosition extends BaseExchangePosition {
    /**
     * 
     * @param {ccxt.Position} ccxtPosition 
     */
    constructor(ccxtPosition) {
        super();
        /** @type {ccxt.Position} */
        this.ccxtPosition = ccxtPosition;
    }

    /** @inheritdoc */
    get contracts() {
        return this.ccxtPosition.contracts;
    }
    
    /** @inheritdoc */
     toJson() {
        return this.ccxtPosition;
    }
}


module.exports = { BaseExchangeCcxtPosition }