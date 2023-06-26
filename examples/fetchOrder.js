const {exchangeInstance} = require('../src/crypto/exchanges/exchanges');
require('dotenv').config();
const ccxt = require('ccxt');
const {parseArgs} = require('util');

const options = {
    symbol: {
      type: 'string',
    },
    id: {
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
    console.log(`usage: --id id --symbol symbol --help`)
    process.exit(0);
}

let exchange = exchangeInstance(process.env.EXCHANGE, {
    paper: process.env.PAPER === 'true',
    exchangeType: process.env.EXCHANGE_TYPE || 'spot',
    verbose: process.env.EXCHANGE_VERBOSE === 'true',
    apiKey: process.env.APIKEY,
    secret: process.env.SECRET,
});


exchange.fetchOrder(values.id, values.symbol)
    .then(results => {console.log("Results:", results)}).catch(ex => {
        exchange.fetchClosedOrder(values.id, values.symbol)
            .then(results => console.log("Results:", results))
            .catch(ex => {
                if (ex instanceof ccxt.OrderNotFound) {
                    exchange.fetchOpenOrder(values.id, values.symbol).then(results => console.log("Results:", results));
                } else {
                    throw ex;
                }       
            });
    });