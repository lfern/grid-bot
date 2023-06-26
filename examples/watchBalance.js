const {exchangeInstance} = require('../src/crypto/exchanges/exchanges');
const { watchMyBalance } = require('../src/crypto/exchanges/utils/procutils');
require('dotenv').config();

let exchange = exchangeInstance(process.env.EXCHANGE, {
    paper: process.env.PAPER === 'true',
    exchangeType: process.env.EXCHANGE_TYPE || 'spot',
    verbose: process.env.EXCHANGE_VERBOSE === 'true',
    apiKey: process.env.APIKEY,
    secret: process.env.SECRET,
});

(async () => {
    await exchange.loadMarkets();
    let res = watchMyBalance(exchange, (balance) => {
        console.log("Balance", balance);
    });
    res.promise.then(res => {
        console.log(`ws closed`)
    }).catch(err => {
        console.log(`ws closed with error`)
        console.error("Error:", err);
    });
})();    

