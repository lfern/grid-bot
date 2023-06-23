const {Bitfinex} = require('../src/crypto/exchanges/Bitfinex');
require('dotenv').config();
const ccxt = require('ccxt');
const { BaseExchange } = require('../src/crypto/exchanges/BaseExchange');

/** @type {BaseExchange} */
let bitfinex = new Bitfinex({
    paper: false,
    apiKey: process.env.BITFINEX_APIKEY,
    secret: process.env.BITFINEX_SECRET,
    exchangeType: 'futures',
    verbose: false,
});

(async () => {
    try {
        await bitfinex.loadMarkets();
        console.log(await bitfinex.fetchBalance());
        //let transfer = await bitfinex.transfer('USDT', 1.6, 'future', 'spot');
        //console.log("Results:", transfer);
        
    } catch(ex) {
        console.log(ex)
    }
})();   


