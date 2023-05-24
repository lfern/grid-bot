const {Bitfinex} = require('../src/crypto/exchanges/Bitfinex');
const { watchMyOrders, watchMyTrades } = require('../src/crypto/exchanges/utils/procutils');
require('dotenv').config();
const ccxt = require('ccxt');


(async () => {
    let bitfinex = new Bitfinex({
        verbose:false,
        paper: true,
        apiKey: process.env.BITFINEX_APIKEY,
        secret: process.env.BITFINEX_SECRET,
        exchangeType: 'spot' // spot, futures, swap
    });

    await bitfinex.loadMarkets();
    let res = watchMyOrders(bitfinex, undefined, (orders) => {
        for(let i=0;i<orders.length;i++) {
            let order = orders[i];
            console.log(order);
        }
    });

    res.promise.then(res => {
        console.log(`ws closed`)
    }).catch(err => {
        console.log(`ws closed with error`)
        console.error(err);
    });
})();   
