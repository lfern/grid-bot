const Queue = require("bull");
require('dotenv').config({path:__dirname+'/./../.env'});
const OrderSenderEventService = require('../src/services/OrderSenderEventService');

const {parseArgs} = require('util');

const options = {
    grid: {
      type: 'string',
    }
};

const {
    values,
    positionals,
} = parseArgs({ args: process.argv.slice(2), options });
const myOrderSenderQueue = new Queue('myOrderSender', {
    redis: {
        host: process.env.REDIS_SERVER || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
    }
});
OrderSenderEventService.init(myOrderSenderQueue);

console.log(values.grid);
OrderSenderEventService.send(parseInt(values.grid));