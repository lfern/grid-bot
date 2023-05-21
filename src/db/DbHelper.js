const pg = require('pg');
/**
 * Database helper
 */
class DbHelper {
    /**
     * 
     * @param {string} user 
     * @param {string} host 
     * @param {string} database 
     * @param {string} password 
     * @param {int} port 
     */
    constructor(user, host, database, password, port) {
        const pool = {
            user,
            host,
            database,
            password,
            port,
            max: 1,
            connectionTimeoutMillis: 2000
        };
        
        /** @type {pg.Client} */
        this.client = null;
        var reconnectLoop = 0;
        var sleepInterval = 0;
        const postgresDBConnect = () => {
            const startedAt = new Date().getTime();
            let cli = new pg.Client(pool)
            cli.on('error', (err) => {
                console.log('startedAt:-', startedAt);
                console.log('crashedAt:-', new Date().getTime());
                this.client = null;
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
                    this.client = cli;
                    console.log('Connected to Postgres Server')
                }
            });

        };
        postgresDBConnect();
        console.log('Starting UP Postgres Connection');
    }
}

module.exports = { DbHelper }