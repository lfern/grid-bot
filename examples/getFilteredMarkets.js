const {Bitfinex} = require('../src/crypto/exchanges/Bitfinex');


let bitfinex = new Bitfinex({
    paper: false
});

bitfinex.loadMarkets().then(markets => { 
    console.log("Markets:", Object.keys(markets));
    console.log("Filtered:" , Object.keys(bitfinex.markets));
});