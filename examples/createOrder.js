const {Bitfinex} = require('../src/crypto/exchanges/Bitfinex');
require('dotenv').config();
const ccxt = require('ccxt');
const { BaseExchange } = require('../src/crypto/exchanges/BaseExchange');

/** @type {BaseExchange} */
let bitfinex = new Bitfinex({
    paper: true,
    apiKey: process.env.BITFINEX_APIKEY,
    secret: process.env.BITFINEX_SECRET,
    exchangeType: 'futures',
    verbose: true,
});

bitfinex.createOrder("TESTBTC/TESTUSDT:TESTUSDT", 'market', 'buy', 0.0006, undefined, {
    leverage: 1
}).then(results => {
    console.log("Results:", results);
}).catch(ex => { console.log(ex)});
