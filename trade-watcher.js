const Queue = require("bull");
const pg = require('pg');
const {Bitfinex} = require('./src/crypto/exchanges/Bitfinex');
require('dotenv').config();
const {sleep} = require('./src/crypto/exchanges/utils/timeutils');
const {watchMyTrades} = require('./src/crypto/exchanges/utils/procutils');
const {exchangeInstance} = require('./src/crypto/exchanges/exchanges');
const {DbHelper} = require('./src/db/DbHelper')

const myTradesQueue = new Queue("myTrades", {
    // Redis configuration
    redis: {
        host: process.env.REDIS_SERVER || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
    },
});

const dbHelper = new DbHelper(
    process.env.POSTGRES_USERNAME,
    process.env.POSTGRES_HOSTNAME,
    process.env.POSTGRES_DB,
    process.env.POSTGRES_PASSWORD,
    process.env.POSTGRES_PORT,
);

let currentConnections = {};
(async () => {
    while (true) {
        console.log("Checking postgresql client is connected ...");
        if (dbHelper.client != null) {
            console.log("Check new accounts...");
            try {
                let accounts = await dbHelper.client.query(`
                    SELECT accounts.*, exchanges.exchange_name, account_types.account_type
                    FROM accounts, account_types, exchanges
                    WHERE accounts.account_type_id = account_types.id and
                        accounts.exchange_id = exchanges.id 
                `);

                let lastIds = [];
                // Create connections for new accounts
                for(let i=0; i < accounts.rows.length; i++) {
                    let account = accounts.rows[i];
                    let id = account.id.toString();
                    lastIds.push(id);
                    if (!(id in currentConnections)) {
                        console.log('New account: ' + account.name);
                        const exchange = exchangeInstance(account.exchange_name, {
                            exchangeType: account.account_type,
                            rateLimit: 1000,  // testing 1 second though it is not recommended (I think we should not send too many requests/second)
                            apiKey: account.api_key,
                            secret: account.api_secret,
                            // this is their documented ratelimit according to this page:
                            // https://docs.bitfinex.com/v1/reference#rest-public-orderbook
                            // 'rateLimit': 1000,  # once every second, 60 times per minute – won't work, will throw DDoSProtection
                        });

                        await exchange.loadMarkets();

                        let res = watchMyTrades(exchange, undefined, async (trades) => {
                            const options = {
                                attempts: 0,
                                removeOnComplete: true,
                                removeOnFail: true,
                            };

                            // send to redis
                            for (let i=0; i < trades.length; i++) {
                                console.log(trades[i].toJson());
                                myTradesQueue.add(trades[i].toJson(), options).then(ret => {
                                    console.log(ret);
                                }). catch(err => {
                                    console.error(err);
                                });
                            }
                        });

                        currentConnections[id] = {
                            exchange,
                            cancel: res.cancel,
                        };

                        res.promise.then(res => {
                            console.log(`ws closed for account ${id} `)
                        }).catch(err => {
                            console.log(`ws closed for account ${id} with error`)
                            console.error(err);
                            if (id in currentConnections){
                                currentConnections[id].cancel();
                                currentConnections[id].exchange.close().catch(e => { });
                                delete currentConnections[id];
                            }
                        })

                    }
                }
                // remove unused accounts 
                let currentIds = Object.keys(currentConnections);
                for (let i = 0; i < currentIds.length; i++) {
                    let id = currentIds[i];
                    if (!lastIds.includes(id)) {
                        console.log("Removing unused client: " + id);
                        currentConnections[id].cancel();
                        await currentConnections[id].exchange.close();
                        delete currentConnections[id];
                    }
                }

            } catch (ex) {
                console.error(ex);
            }
        }
        await sleep(5000);

    }
})()

