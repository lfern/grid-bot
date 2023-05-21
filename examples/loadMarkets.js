const {Bitfinex} = require('../src/crypto/exchanges/Bitfinex');


let bitfinex = new Bitfinex({
    paper: true
});

bitfinex.loadMarkets().then(markets => console.log(markets));