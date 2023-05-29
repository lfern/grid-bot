const broadcastService = require ('../src/services/BroadcastTransactionService')
const fs = require('fs');

const data = fs.readFileSync(process.argv[2], 'utf8');
broadcastService.send(data).then(result => {
    console.log(result);
}).catch(ex => {
    console.error(ex);
});

// txid: fa5f2e0145068875caf145e809d15212a86b629500db31fc2a2f7e4b6651d3c9