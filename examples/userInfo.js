const {exchangeInstance} = require('../src/crypto/exchanges/exchanges');
require('dotenv').config();

let exchange = exchangeInstance(process.env.EXCHANGE, {
    paper: process.env.PAPER === 'true',
    exchangeType: process.env.EXCHANGE_TYPE || 'spot',
    verbose: process.env.EXCHANGE_VERBOSE === 'true',
    apiKey: process.env.APIKEY,
    secret: process.env.SECRET,
});

exchange.userInfoAccounts().then(result => {
    console.log(result);
}).catch(ex => {
    console.error(ex);
});