const {exchangeInstance} = require('../src/crypto/exchanges/exchanges');
require('dotenv').config();
const {parseArgs} = require('util');

const options = {
    symbol: {
      type: 'string',
    },
    side: {
      type: 'string',
    },
    amount: {
        type: 'string',
    },
    type: {
        type: 'string',
    },
    price: {
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
    console.log(`usage: --symbol symbol --side <buy|sell> --amount amount --type <limit|market> --price price --help`)
    process.exit(0);
}

let exchange = exchangeInstance(process.env.EXCHANGE, {
    paper: process.env.PAPER === 'true',
    exchangeType: process.env.EXCHANGE_TYPE || 'spot',
    verbose: process.env.EXCHANGE_VERBOSE === 'true',
    apiKey: process.env.APIKEY,
    secret: process.env.SECRET,
});

exchange.createOrder(values.symbol, values.type, values.side, values.amount, values.price, {
    leverage: 1
}).then(results => {
    console.log("Results:", results);
}).catch(ex => { console.log(ex)});
