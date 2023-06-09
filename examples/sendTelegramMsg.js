const telegramService = require ('../src/services/TelegramService')
require('dotenv').config();

telegramService.sendMessage(
    process.env.TELEGRAM_BOT_TOKEN,
    process.env.TELEGRAM_MY_ID,
    "This is a test"
).then(res => console.log(res))
    .catch(err => console.log(err));
