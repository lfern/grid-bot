const {exchangeInstance} = require('../src/crypto/exchanges/exchanges');
require('dotenv').config();
const {parseArgs} = require('util');

const options = {
    symbol: {
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
    console.log(`usage: --symbol symbol --help`)
    process.exit(0);
}

let exchange = exchangeInstance(process.env.EXCHANGE, {
    paper: process.env.PAPER === 'true',
    exchangeType: process.env.EXCHANGE_TYPE || 'spot',
    verbose: process.env.EXCHANGE_VERBOSE === 'true',
    apiKey: process.env.APIKEY,
    secret: process.env.SECRET,
});

exchange.fetchPositions(values.symbol).then(results => results.forEach(result => console.log("Contracts:", result.contracts)));