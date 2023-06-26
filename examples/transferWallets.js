const {exchangeInstance} = require('../src/crypto/exchanges/exchanges');
require('dotenv').config();

let exchange = exchangeInstance(process.env.EXCHANGE, {
    paper: process.env.PAPER === 'true',
    exchangeType: process.env.EXCHANGE_TYPE || 'spot',
    verbose: process.env.EXCHANGE_VERBOSE === 'true',
    apiKey: process.env.APIKEY,
    secret: process.env.SECRET,
});

(async () => {
    try {
        await exchange.loadMarkets();
        console.log(await exchange.fetchBalance());
        let transfer = await exchange.transfer('USDT', 1.6, 'future', 'spot');
        console.log("Results:", transfer);
        
    } catch(ex) {
        console.log(ex)
    }
})();   


