const {exchangeInstance} = require('../src/crypto/exchanges/exchanges');

let exchange = exchangeInstance(process.env.EXCHANGE, {
    paper: process.env.PAPER === 'true',
    exchangeType: process.env.EXCHANGE_TYPE || 'spot',
    verbose: process.env.EXCHANGE_VERBOSE === 'true',
});

exchange.loadMarkets().then(markets => { 
    console.log("Markets:", Object.keys(markets));
    console.log("Filtered:" , Object.keys(exchange.markets));
});