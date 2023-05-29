const broadcastService = require ('../src/services/BroadcastTransactionService')
const fs = require('fs');

broadcastService.get("fa5f2e0145068875caf145e809d15212a86b629500db31fc2a2f7e4b6651d3c9").then(result => {
    console.log(result);
}).catch(ex => {
    console.error(ex);
});

// txid: fa5f2e0145068875caf145e809d15212a86b629500db31fc2a2f7e4b6651d3c9
/*
{
  "txid": "fa5f2e0145068875caf145e809d15212a86b629500db31fc2a2f7e4b6651d3c9",
  "version": 2,
  "locktime": 2363517,
  "vin": [
    {
      "txid": "c27013113948e6b262aec3f5079bc77256bc5b002fb797444ab068748a534293",
      "vout": 1,
      "prevout": {
        "scriptpubkey": "0014e15854abcf0d552e0d19c2262476f278efcbb98e",
        "scriptpubkey_asm": "OP_0 OP_PUSHBYTES_20 e15854abcf0d552e0d19c2262476f278efcbb98e",
        "scriptpubkey_type": "v0_p2wpkh",
        "scriptpubkey_address": "ex1qu9v9f270p42jurgecgnzgahj0rhuhwvwu9sztc",
        "valuecommitment": "08f203d9e0e5503dff26c072ff737a18dec1f89362ed946373f46b92997dffd8ce",
        "assetcommitment": "0b10ad1c11104d08f20fef751e557dd7221edc8120e28c047e442c7811fbe3fb96"
      },
      "scriptsig": "",
      "scriptsig_asm": "",
      "witness": [
        "304402200fc7a01212c8bb737ba11113434a89f94b9650b428b9523a428ab70ba6bfb1970220507cf2507c6ba7b5fc947b90a8aadb26eb6a602a4302b8bd4dbcc9ffdfbcc70e41",
        "03ee9aa2704d9af5b9dd6bd0c650459ca4775c46675571903d8b0d1163a9e791b6"
      ],
      "is_coinbase": false,
      "sequence": 4294967294,
      "is_pegin": false
    }
  ],
  "vout": [
    {
      "scriptpubkey": "a91457acb2ef0395dc652b299292c5629166b3a77f8287",
      "scriptpubkey_asm": "OP_HASH160 OP_PUSHBYTES_20 57acb2ef0395dc652b299292c5629166b3a77f82 OP_EQUAL",
      "scriptpubkey_type": "p2sh",
      "scriptpubkey_address": "GqB75FygbynYCLj3Sc14xZ2e8TLxce9rcD",
      "valuecommitment": "09d843f5f09afa71fa5811ce23ccc068c032ef28e0324b1168556caba1692433e6",
      "assetcommitment": "0ab697f0c59bb4417e50f678fa32a7e9240ef293a271986b6ca1980c19380cd040"
    },
    {
      "scriptpubkey": "0014ee49117e3b46db838d7c2bed2b62356d48c83a13",
      "scriptpubkey_asm": "OP_0 OP_PUSHBYTES_20 ee49117e3b46db838d7c2bed2b62356d48c83a13",
      "scriptpubkey_type": "v0_p2wpkh",
      "scriptpubkey_address": "ex1qaey3zl3mgmdc8rtu90kjkc34d4yvswsn3pnhqs",
      "valuecommitment": "0983077e68e83193250c64de50c17f3c76ffd156c2199e7b4e0367526ff93ebf83",
      "assetcommitment": "0b08db98b5e1d1ed8f1bba55b0b9e9b2c39bb664d98dd71425101efc6c49c4925d"
    },
    {
      "scriptpubkey": "",
      "scriptpubkey_asm": "",
      "scriptpubkey_type": "fee",
      "value": 250,
      "asset": "6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d"
    }
  ],
  "size": 8943,
  "weight": 9966,
  "fee": 250,
  "status": {
    "confirmed": true,
    "block_height": 2367702,
    "block_hash": "78e1f66eb18654e75010a59a901371be942aefd26d1c1840e9d0e0c1ddf562e9",
    "block_time": 1685394488
  }
}
*/