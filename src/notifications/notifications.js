const models = require('../../models');
const { SCOPE_STRATEGY, SCOPE_OTHER } = require('../services/NotificationEventService');
const TelegramService = require('../services/TelegramService');
/** @typedef {import('../services/NotificationEventService').NotificationMessageData} NotificationMessageData */


/**
 * 
 * @param {NotificationMessageData} data 
 */
exports.notificationHandler = async function (data, timestamp, telegramBotToken) {
    let telegramChats = [];

    if (data.scope) {
        if (data.scope.scope == SCOPE_STRATEGY) {
            let chatIds = await models.TelegramScopeStrategy.findAll({
                attributes:['telegram_chat_id'],
                where: {strategy_id: data.scope.strategyId},
            });
    
            telegramChats = await models.TelegramChatid.findAll({
                where: {
                    level: { [models.Sequelize.Op.lte]: data.level},
                    scope: 'strategy',
                    id: chatIds.map(function(d){ return d.telegram_chat_id}),
                    is_valid: true,
                }
            });
        } else if (data.scope.scope == SCOPE_OTHER) {
            telegramChats = await models.TelegramChatid.findAll({
                where: {
                    level: { [models.Sequelize.Op.lte]: data.level},
                    scope: 'other',
                    is_valid: true,
                }
            });
        }
    }

    if (telegramChats.length == 0) {
        telegramChats = await models.TelegramChatid.findAll({
            where: {
                level: { [models.Sequelize.Op.lte]: data.level},
                scope: null,
                is_valid: true,
            }
        });
    }

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