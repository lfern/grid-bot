const https = require('https');
const _ = require('lodash');

const url = 'https://api.telegram.org/bot';

exports.getUpdates = function(token, offset) {
    return new Promise((resolve, reject) => {
        let parsedUrl = new URL(`${url}${token}/getUpdates${offset!=undefined?'?offset='+offset:''}`);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname+parsedUrl.search,
            method: 'GET',
        };

        var req = https.request(options, (res) => {
            const body = [];
            
            res.on('data', (chunk) => body.push(chunk))
            res.on('end', () => {
                const resString = Buffer.concat(body).toString();
                if (res.status < 200 || res.statusCode > 299) {
                    console.error(resString);
                    reject(new Error(`HTTP status code ${res.statusCode} ${resString}`));
                } else {
                    resolve(resString);
                }
            })
        });
        
        req.on('error', (e) => {
            reject(e);
        });

        req.on('timeout', () => {
            req.destroy()
            reject(new Error('Request time out'))
        });

        req.end();
    });
}

exports.sendMessage = function(token, chatId, message) {
    let rawMessage = JSON.stringify({
        chat_id: chatId,
        text: message,
    });

    return new Promise((resolve, reject) => {
        let parsedUrl = new URL(`${url}${token}/sendMessage`);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(rawMessage)
            }
        };

        var req = https.request(options, (res) => {
            const body = [];
            
            res.on('data', (chunk) => body.push(chunk))
            res.on('end', () => {
                const resString = Buffer.concat(body).toString();
                if (res.status < 200 || res.statusCode > 299) {
                    console.error(resString);
                    reject(new Error(`HTTP status code ${res.statusCode} ${resString}`));
                } else {
                    resolve(resString);
                }
            })
        });
        
        req.on('error', (e) => {
            reject(e);
        });

        req.on('timeout', () => {
            req.destroy()
            reject(new Error('Request time out'))
        });
        console.log(rawMessage)
        req.write(rawMessage);

        req.end();
    });

}