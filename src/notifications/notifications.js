const models = require('../../models');
const TelegramService = require('../services/TelegramService');
/** @typedef {import('../services/NotificationEventService').NotificationMessageData} NotificationMessageData */


/**
 * 
 * @param {NotificationMessageData} data 
 */
exports.notificationHandler = async function (data, timestamp, telegramBotToken) {
    let telegramChats = await models.TelegramChatid.findAll({
        where: {
            level: { [models.Sequelize.Op.gte]: data.level},
            is_valid: true,
        }
    });

    for(let i=0; i < telegramChats.length; i++) {
        let telegramChat = telegramChats[i];
        try {
            console.log(timestamp);
            console.log(Date.now());
            let date = new Date(timestamp);
            await TelegramService.sendMessage(
                telegramBotToken,
                telegramChat.chat_id,
                `${date.toISOString()} ${data.message}`);
        } catch (ex) {
            if (ex instanceof TelegramService.TelegramForbiddenException) {
                models.TelegramChatid.update({is_valid: false}, {where: {id: telegramChat.id}})
            } else {
                console.error(ex);
            }
        }
    }
};