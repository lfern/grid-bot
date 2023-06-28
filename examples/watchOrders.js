const {exchangeInstance} = require('../src/crypto/exchanges/exchanges');
const { watchMyOrders, watchMyTrades } = require('../src/crypto/exchanges/utils/procutils');
require('dotenv').config();
const ccxt = require('ccxt');


(async () => {
    let exchange = exchangeInstance(process.env.EXCHANGE, {
        paper: process.env.PAPER === 'true',
        exchangeType: process.env.EXCHANGE_TYPE || 'spot',
        verbose: process.env.EXCHANGE_VERBOSE === 'true',
        apiKey: process.env.APIKEY,
        secret: process.env.SECRET,
    });

    await exchange.loadMarkets();
    let res = watchMyOrders(exchange, undefined, (orders) => {
        for(let i=0;i<orders.length;i++) {
            let order = orders[i];
            console.log("Order:", order);
        }
    });

    let res2 = watchMyTrades(exchange, undefined, (trades) => {
        for(let i=0;i<trades.length;i++) {
            let trade = trades[i];
            console.log("Trade:", trade);
        }
    });

    Promise.all([
        res.promise,
        res2.promise
    ]).then(res => {
        console.log(`ws closed`)
    }).catch(err => {
        console.log(`ws closed with error`)
        console.error("Error:", err);
    });
})();   
