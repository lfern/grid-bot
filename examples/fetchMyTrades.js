const {exchangeInstance} = require('../src/crypto/exchanges/exchanges');
require('dotenv').config();
const {parseArgs} = require('util');

const options = {
    symbol: {
      type: 'string',
    },
    orderid: {
        type: 'string',
    },
    help: {
        type: 'boolean'
    }
};

const {
    values,
    positionals,
} = parseArgs({ args: process.argv.slice(2), options });

if (values.help) {
    console.log(`usage: --symbol symbol --orderid order --help`)
    process.exit(0);
}

let exchange = exchangeInstance(process.env.EXCHANGE, {
    paper: process.env.PAPER === 'true',
    exchangeType: process.env.EXCHANGE_TYPE || 'spot',
    verbose: process.env.EXCHANGE_VERBOSE === 'true',
    apiKey: process.env.APIKEY,
    secret: process.env.SECRET,
});

exchange.fetchMyTrades(values.symbol, undefined, 5, {filter: {execType:'Funding'}}).then(results => {
//exchange.fetchMyTrades(values.symbol, undefined, 1, {filter: {execType:undefined}}).then(results => {
//exchange.fetchMyTrades(values.symbol, 1000, 2).then(results => {
    console.log("Results:", JSON.stringify(results, null, 2));
}).catch(ex => { console.log(ex)});
