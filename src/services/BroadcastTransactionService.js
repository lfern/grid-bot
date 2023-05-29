const https = require('https');

const endpoint = {
    testnet: {
        hostname: "blockstream.info",
        baseUrl: "/liquidtestnet/api",
    },
    api: {
        hostname: "blockstream.info",
        baseUrl: "/liquid/api",
    }
}

exports.send = function(transactionRaw, testnet = false) {
    let api = testnet ? endpoint.testnet : endpoint.api;
    return new Promise((resolve, reject) => {
        var options = {
            hostname: api.hostname,
            port: 443,
            path: api.baseUrl+'/tx',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': transactionRaw.length
            }
        };
        
        var req = https.request(options, (res) => {
            const body = [];
            res.on('data', (chunk) => body.push(chunk))
            res.on('end', () => {
                const resString = Buffer.concat(body).toString();
                if (res.status < 200 || res.statusCode > 299) {
                    console.error(resString);
                    reject(new Error(`HTTP status code ${res.statusCode}`));
                } else {
                    resolve(resString);
                }
            })
        });
        
        req.on('error', (e) => {
            reject(e);
        });
        
        req.write(transactionRaw);
        req.end();
    });

}

exports.get = function(txid, testnet = false) {
    let api = testnet ? endpoint.testnet : endpoint.api;
    return new Promise((resolve, reject) => {
        var options = {
            hostname: api.hostname,
            port: 443,
            path: api.baseUrl+'/tx/'+txid,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        var req = https.request(options, (res) => {
              
            const body = [];
            res.on('data', (chunk) => body.push(chunk))
            res.on('end', () => {
                const resString = Buffer.concat(body).toString();
                if (res.status < 200 || res.statusCode > 299) {
                    console.error(resString);
                    reject(new Error(`HTTP status code ${res.statusCode}`));
                } else {
                    resolve(resString);
                }
            })
        });
        
        req.on('error', (e) => {
            reject(e);
        });
        
        req.end();
    });
}