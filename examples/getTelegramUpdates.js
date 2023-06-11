const telegramService = require ('../src/services/TelegramService')
require('dotenv').config();
console.log( process.env.TELEGRAM_BOT_TOKEN)
telegramService.getUpdates(
    process.env.TELEGRAM_BOT_TOKEN,
).then(res => {
    const response = JSON.parse(res);
    if (response.ok) {
        let offset;
        response.result.forEach(x => {
            console.log(x);
            offset = x.update_id;
        });

        if (offset != undefined) {
            return telegramService.getUpdates(
                process.env.TELEGRAM_BOT_TOKEN,
                offset+1,
            ).then(res => {
                console.log(res);
            });
        }
    }
}).catch(err => console.log(err));
