const { NotSupported } = require('ccxt');
const {exchangeInstance} = require('../src/crypto/exchanges/exchanges');
require('dotenv').config();

let exchange = exchangeInstance(process.env.EXCHANGE, {
    paper: process.env.PAPER === 'true',
    exchangeType: process.env.EXCHANGE_TYPE || 'spot',
    verbose: process.env.EXCHANGE_VERBOSE === 'true',
    apiKey: process.env.APIKEY,
    secret: process.env.SECRET,
});

exchange.fetchDeposits().then(results => console.log("Results:", results)).catch(ex => {
    if (ex instanceof NotSupported) {
        console.log("fetchDeposits not supported");
        return exchange.fetchTransactions().then(results => console.log("Results:", results));
    }

    throw ex;
});
