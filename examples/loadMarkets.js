const {exchangeInstance} = require('../src/crypto/exchanges/exchanges');
require('dotenv').config();

let exchange = exchangeInstance(process.env.EXCHANGE, {
    paper: process.env.PAPER === 'true',
    exchangeType: process.env.EXCHANGE_TYPE || 'spot',
    verbose: process.env.EXCHANGE_VERBOSE === 'true',
});

exchange.loadMarkets().then(markets =>{ 
    console.log("Markets:");
    console.log(JSON.stringify(markets, null, 2));
    console.log("Currencies:");
    //console.log(JSON.stringify(exchange.ccxtExchange.currencies, null, 2));

    console.log(exchange.ccxtExchange.amountToPrecision2('BTC/USDT:USDT', 0.12));
    //console.log(exchange.priceToPrecision("BTC/USDT", 100.55));
    //console.log(exchange.amountToPrecision("BTC/USDT", 0.00006));
});