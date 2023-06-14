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
}

module.exports = {AccountRepository}
