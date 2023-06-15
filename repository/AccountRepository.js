const models = require('../models');

class AccountRepository {
    async getInstance(id, join = true) {
        let options = {
            where: {
                id: id,
            },
        };

        if (join) {
            options.include = [
                models.Account.Exchange,
                models.Account.AccountType
            ];
        }

        return await models.Account.findOne(options);
    }

    async setTransferPermission(accountId, isEnabled) {
        await models.Account.update({transfer_permission: isEnabled}, {where: {id: accountId}});
    }
}

module.exports = {AccountRepository}
