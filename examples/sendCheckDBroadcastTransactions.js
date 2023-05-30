const broadcastTransactionHandler = require('../src/grid/BroadcastTransactionHandler');

broadcastTransactionHandler.execute().then(() => {
    console.log("ok");
}).catch(ex => console.log(ex));