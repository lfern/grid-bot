const {Bitfinex} = require('../src/crypto/exchanges/Bitfinex');
require('dotenv').config();

let bitfinex = new Bitfinex({
    paper: true,
    apiKey: process.env.BITFINEX_APIKEY,
    secret: process.env.BITFINEX_SECRET,
    exchangeType: 'spot'
});

bitfinex.fetchOrderTrades(process.argv[2], process.argv[3]).then(results => console.log("Results:", results));