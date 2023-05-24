const {exchangeInstanceWithMarkets} = require('../src/services/ExchangeMarket');

(async () => {
    const exchange = await exchangeInstanceWithMarkets('bitfinex2', {
        verbose: true
    });
    console.log("loading markets...")
    await exchange.loadMarkets();
})()