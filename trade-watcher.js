const Queue = require("bull");
const pg = require('pg');
const {Bitfinex} = require('./src/crypto/exchanges/Bitfinex');
require('dotenv').config();
const {sleep} = require('./src/crypto/exchanges/utils/timeutils');
const {watchMyTrades} = require('./src/crypto/exchanges/utils/procutils');
const {exchangeInstance} = require('./src/crypto/exchanges/exchanges');

const myTradesQueue = new Queue("myTrades", {
    // Redis configuration
    redis: {
        host: process.env.REDIS_SERVER || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
    },
});

const pool = {
    user: process.env.POSTGRES_USERNAME,
    host: process.env.POSTGRES_HOSTNAME,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
    max: 1,
    connectionTimeoutMillis: 2000
};console.log(pool);


/** @type {pg.Client} */
let client = null;
var reconnectLoop = 0;
var sleepInterval = 0;
let currentConnections = {};
const postgresDBConnect = () => {
    const startedAt = new Date().getTime();
    let cli = new pg.Client(pool)
    cli.on('error', (err) => {
        console.log('startedAt:-', startedAt);
        console.log('crashedAt:-', new Date().getTime());
        client = null;
        //Reconnect
        reconnectLoop = reconnectLoop + 1;
        sleepInterval = reconnectLoop * 1000;
        console.log('Trying Reconnect1' + ' Sleep Timeout ' + sleepInterval);
        setTimeout(postgresDBConnect, sleepInterval);
    });


    cli.connect(err => {
        if (err) {
            console.error('Connection issue:', err.stack)
            reconnectLoop = reconnectLoop + 1
            sleepInterval = 1000 * reconnectLoop
            console.log('Trying Reconnect2' + '. Sleep Timeout ' + sleepInterval)
            cli.end()
            setTimeout(postgresDBConnect, sleepInterval)

        } else {
            client = cli;
            console.log('Connected to Postgres Server')
        }
    });

};

console.log('Starting UP Postgres Connection');
postgresDBConnect();

(async () => {
    while (true) {
        console.log("Checking...");
        if (client != null) {
            console.log("Checking...");
            try {
                let accounts = await client.query(`
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
                        console.log(account);
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
                        }).catch(err => {
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

