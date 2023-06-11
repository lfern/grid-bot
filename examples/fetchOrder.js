const {Bitfinex} = require('../src/crypto/exchanges/Bitfinex');
require('dotenv').config();
const ccxt = require('ccxt');

let bitfinex = new Bitfinex({
    paper: true,
    apiKey: process.env.BITFINEX_APIKEY,
    secret: process.env.BITFINEX_SECRET,
    exchangeType: 'spot'
});

bitfinex.fetchClosedOrder(process.argv[2], process.argv[3])
    .then(results => console.log("Results:", results))
    .catch(ex => {
        if (ex instanceof ccxt.OrderNotFound) {
            bitfinex.fetchOpenOrder(process.argv[2], process.argv[3]).then(results => console.log("Results:", results));
        } else {
            throw ex;
        }       
    });
