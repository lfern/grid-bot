const { Bitfinex } = require('./src/crypto/exchanges/Bitfinex');

(async () => {
    try {
        let bitfinex = new Bitfinex({
            verbose: true,
        });

        console.log(await bitfinex.loadMarkets());

        let bitfinex2 = new Bitfinex({
            verbose: true,
        });
        console.log("------------------------------------")

        bitfinex2.initMarketsFrom(bitfinex);
        //console.log(await bitfinex2.loadMarkets());
    } catch (ex) {
        console.error("Error:", ex);
    }
})()
