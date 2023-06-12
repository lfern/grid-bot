const { NotSupported } = require('ccxt');
const {Bitfinex} = require('../src/crypto/exchanges/Bitfinex');
require('dotenv').config();

let bitfinex = new Bitfinex({
    // paper: true,
    apiKey: process.env.BITFINEX_APIKEY,
    secret: process.env.BITFINEX_SECRET,
    // exchangeType: 'margin'
});

bitfinex.fetchDeposits().then(results => console.log("Results:", results)).catch(ex => {
    if (ex instanceof NotSupported) {
        console.log("fetchDeposits not supported");
        return bitfinex.fetchTransactions().then(results => console.log("Results:", results));
    }

    throw ex;
});
