const {exchangeInstance} = require('../src/crypto/exchanges/exchanges');
require('dotenv').config();

let exchange = exchangeInstance(process.env.EXCHANGE, {
    paper: process.env.PAPER === 'true',
    exchangeType: process.env.EXCHANGE_TYPE || 'spot',
    verbose: process.env.EXCHANGE_VERBOSE === 'true',
    apiKey: process.env.APIKEY,
    secret: process.env.SECRET,
});

exchange.fetchExtendedLedger('BTC', 1000, 2500).then(results => {
    console.log(`ID;DIRECTION;ACCOUNT;TYPE;NFTYPE;NFSUBTYPE;NFWALLET;CURRENCY;AMOUNT;TS;DT;BEFORE;AFTER;STATUS;FEE;"FEE CURR";DESCRIPTION`) 
    for(let i=0;i<results.length;i++) {
        let result = results[i];
        console.log(result);continue;
        console.log(
            result.id + ";" +
            result.direction + ";" +
            result.account + ";" +
            "\""+result.type+"\"" + ";" +
            "\""+result.newFType+"\"" + ";" +
            "\""+result.newFSubtype+"\"" + ";" +
            "\""+result.newFWallet+"\"" + ";" +
            result.currency + ";" +
            result.amount + ";" +
            result.timestamp + ";" +
            result.datetime + ";" +
            result.before + ";" +
            result.after + ";" +
            result.status + ";" +
            (result.fee ? result.fee.cost:'') + ";" +
            (result.fee ? result.fee.currency: '') + ";" +
            "\""+result.newFDescription+"\""
            );
    }
});