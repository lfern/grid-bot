const {Bitfinex} = require('../src/crypto/exchanges/Bitfinex');
const { watchMyOrders, watchMyTrades } = require('../src/crypto/exchanges/utils/procutils');
require('dotenv').config();

let bitfinex = new Bitfinex({
    paper: true,
    apiKey: process.env.BITFINEX_APIKEY,
    secret: process.env.BITFINEX_SECRET,
    exchangeType: 'spot' // spot, futures, swap
});

(async () => {
    await bitfinex.loadMarkets();
    let res = watchMyOrders(bitfinex, undefined, (orders) => {
        while (orders.length > 0) {
            let order = orders.shift();
            console.log(order);
        }
        orders.length = 0;
    });

    res.promise.then(res => {
        console.log(`ws closed`)
    }).catch(err => {
        console.log(`ws closed with error`)
        console.error(err);
    });

})();    

