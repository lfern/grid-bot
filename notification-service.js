const Queue = require("bull");
const { sleep } = require("./src/crypto/exchanges/utils/timeutils");
require('dotenv').config();
const {initLogger, captureConsoleLog} = require("./src/utils/logger");
const {notificationWorker} = require('./src/workers/notification-worker');
const TelegramService = require('./src/services/TelegramService');

/** @typedef {import('./src/notifications/notifications').NotificationMessageData} NotificationMessageData */

initLogger(
    process.env.LOGGER_SERVICE_ALL_FILE || 'logs/notification-all.log' ,
    process.env.LOGGER_SERVICE_ERROR_FILE || 'logs/notification-error.log',
);

captureConsoleLog();

const myNotificationQueue = new Queue("myNotification", {
    redis: { 
        host: process.env.REDIS_SERVER || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
    }
});


myNotificationQueue.process(notificationWorker(process.env.TELEGRAM_BOT_TOKEN));


new Promise(async (resolve, reject) => {
    let offset;
    while (true) {
        try {
            console.log("Getting new messages...");
            let data = await TelegramService.getUpdates(process.env.TELEGRAM_BOT_TOKEN, offset != undefined?1+offset:undefined);
            console.log(data);
            offset = undefined;
            const response = JSON.parse(data);
            if (response.ok) {
                for(let i=0; i<response.result.length; i++) {
                    let x = response.result[i];
                    offset = x.update_id;
                    if (x.message && x.message.text && x.message.text == '/start' &&
                        x.message.chat && x.message.chat.id) {
                        await TelegramService.sendMessage(
                            process.env.TELEGRAM_BOT_TOKEN,
                            x.message.chat.id,
                            `Your chat id is ${x.message.chat.id}; please copy this id and paste in the grid-bot application to receive messages`
                        );
                    }
                }
            }
        
        } catch (ex) {
            console.error(ex);
        }

        await sleep(5000)
    }

    resolve();
}).then(res => console.log("Process finished"))
.catch(ex => console.error(ex));


/*
Message when user blocks bot in telegram
{
  update_id: 74930780,
  my_chat_member: {
    chat: {
      id: 170680299,
      first_name: 'Luis',
      username: 'lfern70',
      type: 'private'
    },
    from: {
      id: 170680299,
      is_bot: false,
      first_name: 'Luis',
      username: 'lfern70',
      language_code: 'es'
    },
    date: 1686306339,
    old_chat_member: { user: [Object], status: 'member' },
    new_chat_member: { user: [Object], status: 'kicked', until_date: 0 }
  }
}

Message when user blocks bot in telegram
{
  update_id: 74930781,
  my_chat_member: {
    chat: {
      id: 170680299,
      first_name: 'Luis',
      username: 'lfern70',
      type: 'private'
    },
    from: {
      id: 170680299,
      is_bot: false,
      first_name: 'Luis',
      username: 'lfern70',
      language_code: 'es'
    },
    date: 1686306489,
    old_chat_member: { user: [Object], status: 'kicked', until_date: 0 },
    new_chat_member: { user: [Object], status: 'member' }
  }
}

Message when user starts bot
{
  update_id: 74930782,
  message: {
    message_id: 14,
    from: {
      id: 170680299,
      is_bot: false,
      first_name: 'Luis',
      username: 'lfern70',
      language_code: 'es'
    },
    chat: {
      id: 170680299,
      first_name: 'Luis',
      username: 'lfern70',
      type: 'private'
    },
    date: 1686306489,
    text: '/start',
    entities: [ [Object] ]
  }
}
*/
