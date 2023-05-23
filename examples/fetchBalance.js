const {Bitfinex} = require('../src/crypto/exchanges/Bitfinex');
require('dotenv').config();

let bitfinex = new Bitfinex({
    paper: true,
    apiKey: process.env.BITFINEX_APIKEY,
    secret: process.env.BITFINEX_SECRET,
    exchangeType: 'margin'
});

bitfinex.fetchBalance().then(results => console.log(results));