const {Bitfinex} = require('../src/crypto/exchanges/Bitfinex');
const { watchMyBalance } = require('../src/crypto/exchanges/utils/procutils');
require('dotenv').config();

let bitfinex = new Bitfinex({
    paper: true,
    apiKey: process.env.BITFINEX_APIKEY,
    secret: process.env.BITFINEX_SECRET,
    exchangeType: 'swap' // spot, futures, swap
});

(async () => {
    await bitfinex.loadMarkets();
    let res = watchMyBalance(bitfinex, (balance) => {
        console.log("Balance", balance);
    });
    res.promise.then(res => {
        console.log(`ws closed`)
    }).catch(err => {
        console.log(`ws closed with error`)
        console.error("Error:", err);
    });
})();    

