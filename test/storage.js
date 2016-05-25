'use strict';

var _ = require('lodash');
var async = require('async');
var chai = require('chai');
var sinon = require('sinon');
var should = chai.should();
var tingodb = require('tingodb')({
  memStore: true
});
var Cursor = require('../node_modules/tingodb/lib/tcursor');
var bitcore = require('bitcore-lib');

var Storage = require('../lib/storage');
var Model = require('../lib/model');

var db, storage;

function openDb(cb) {
  db = new tingodb.Db('./db/test', {});
  // HACK: There appears to be a bug in TingoDB's close function where the callback is not being executed
  db.__close = db.close;
  db.close = function(force, cb) {
    this.__close(force, cb);
    return cb();
  };
  return cb();
}


function resetDb(cb) {
  if (!db) return cb();
  db.dropDatabase(function(err) {
    return cb();
  });
}

var TRANSACTION_PARAMS = [
  {
    address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
    walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a9',
    txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff9',
    blockHeight: 3,
    receiving: true,
    network: 'testnet'
  },
  {
    address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
    walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a9',
    txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff0',
    blockHeight: 2,
    receiving: true,
    network: 'testnet'
  },
  {
    address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
    walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a9',
    txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff1',
    blockHeight: 1,
    receiving: true,
    network: 'testnet'
  },
  {
    address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
    walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a9',
    txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8',
    blockHeight: 4,
    receiving: true,
    network: 'testnet'
  },
  {
    address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
    walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8aa',//different id, should not be in results
    txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ffa',
    blockHeight: 4,
    receiving: true,
    network: 'testnet'
  }
];

var TRANSACTIONS = [
  Model.WalletTransaction.create(TRANSACTION_PARAMS[3]), // height 4
  Model.WalletTransaction.create(TRANSACTION_PARAMS[0]), // height 3
  Model.WalletTransaction.create(TRANSACTION_PARAMS[1]), // height 2
  Model.WalletTransaction.create(TRANSACTION_PARAMS[2]), // height 1
];

var BLOCK_PARAMS = [
  {
    height: 4,
    hash: '000000004ebadb55ee9096c9a2f8880e09da59c0d68b1c228da88e48844a1485',
    previousHash: '0000000082b5015589a3fdf2d4baff403e6f0be035a5d9742c1cae6295464449',
    network: 'testnet'
  },
  {
    height: 3,
    hash: '0000000082b5015589a3fdf2d4baff403e6f0be035a5d9742c1cae6295464449',
    previousHash: '000000006a625f06636b8bb6ac7b960a8d03705d1ace08b1a19da3fdcc99ddbd',
    network: 'testnet'
  },
  {
    height: 2,
    hash: '000000006a625f06636b8bb6ac7b960a8d03705d1ace08b1a19da3fdcc99ddbd',
    previousHash: '00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048',
    network: 'testnet'
  },
  {
    height: 1,
    hash: '00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048',
    previousHash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
    network: 'testnet'
  }
];

var BLOCKS = [
  Model.Block.create(BLOCK_PARAMS[0]),
  Model.Block.create(BLOCK_PARAMS[1]),
  Model.Block.create(BLOCK_PARAMS[2]),
  Model.Block.create(BLOCK_PARAMS[3])
];

var RAW_BLOCK_HEX = '04000000ff36b665b401c82dd822c4de19fee11731e9c9074a3bda040000000000000000fd724ad0a39fbc41c6fc2a7079da5c8e264fba7a77914b5e22936eb53dbac87a09040557f4960618c06074490e01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff2c030032061f4d696e656420627920416e74506f6f6c20626a313520107a10ac2057050409381d00004d940700ffffffff0170ec0895000000001976a91435df7e6daa60393b0ed2474a21713a845a2212dd88ac000000000100000001f52c9f5ae50b1ad7bd44dc139cd04599350eae77576c86bfb83e3496efc9c7d5000000006a47304402203895f6cf5788cc585eba742b01014bd096ff4c6bacbaa7388b595666eb15fa840220271694c9bbeca67c6a4cd2ca9b244d794f478858c7b7ec8bcccc4fd53081e75201210394311c951a5984ba81a6614898cd0198d4934b6b05a315bef9fdb532299e39d3feffffff02f49c492b000000001976a914e00d16dfc2177b82f641ec8ac23c25dbdcf0c45d88acb0135604000000001976a914d2717b77cd1ddadba5ce31fcc6b8a58dd8208b8d88acf431060001000000014115fac80f741ef0305d07b30a1962337f91a89f53eae672d9ba3c08bb551f2201000000d90047304402207e04dd88e19041d56b87855f8107432143bcedfd53daca61e6073d07d065d1d002200f27b0654c9cad4d8e6025c5dffb26aa2d4a453e84a8818748d9a375d01230aa0147304402202233c906c42565905b11c0c80b40e13c0bdea584da59466544d53b9757ac207f022044b181838da43b82872fb00a43f33f9448a0c3862aaa6dab948c8e479b40e243014752210303ff77fc117765ba0c3acb3c4ddf2a4e5bc9a7d27ff02a093fc6571274f7745221038c75c1e5f487086f2ffc3ce6d3351fc62b9276a7e574deed94611d6e545472da52aeffffffff0200c90900000000001976a9149fb1717b9b2cddb0c56761be2dabb2b4ff2c977288ac288cc3020000000017a9144b5887bc30a5585ba37241afe181b3a9da76e97387000000000100000001b3d8c07cb931e4c933f4d2f1686ff4f64bd70675a8417866a6c7fd5b8f39015b010000006b483045022100b9b9f409451b2399c3472d752170232eeae5cac5f08b411ef4565466a82e9b5702200883ab6b451f1bb734e01298531a9cf7bb85002927f05d0e5f2d787cdf7871b80121032cd3e254198e81331ef82358380bedc5c8109a2e876825af39f5c7233487e4cffeffffff02c07af204000000001976a914ba0679eead66fc1911791fcae9df430afa2a0cce88ac40fcea00000000001976a914e2d5edd26bbd47490b9d16ed5cf0bd065ee9c9e088acf431060001000000013cde0f2529e66bd882ecc06cafa8dd0c1d343f97d2e26344119a09e0fd2b6a4f010000006a47304402202dc97765330ed629b0c25d2fe8772d02e8cefdabdc0061ae053792c8aaa0eb87022052d9da3bf9b5daf54efbfb237442e21095bc7b243eaefe32d23959c2a04e896f0121025dcbeebd0347dc0465c6668ccadedae3080cd98f7bc0f0261de4b145f60ed59cfeffffff02ec01de010000000017a9140325a7421222b06c8832368e5f6aface91082a6e87f40f7617000000001976a9142bc5c9bd0c5bb166859b01db943ee041d324c5d888acf4310600010000000266e1d221c4ad4b4ac38276ea2129d54b911bfd7f5afdba95be63a25f90ecbc2f00000000da00483045022100d66c49a76311a381d4e080f43a6e4adbacb79ab809f01bd10085e8f853a89f31022069e1c8ea972b49e7222b85147ee4ae0ba2384834e9c0fcdf785becb57db12d1201473044022036f002cd825d92125335279b4c9d4ade9ced58538801df9c8ecae63d9a90c2b2022049d2ac6922fbeb8fbc38554c1f7bb7e8add350df603a484d6503fb268219aaa6014752210376f0f5b43e4eef7d7d3095a889beb421ced8add13c3d4dda04b1f697ec624aa921038c75c1e5f487086f2ffc3ce6d3351fc62b9276a7e574deed94611d6e545472da52aeffffffff458a21268242d03847bb8aa87d3676f1023fa9a5f26518eeb2dcfe949fa38faa01000000da004830450221008be84c70e76c45b45e066d6eab139314180ca0fb021184ccc2218e1c7c285ed0022071cffe4706c2d7f6961ecc60aa98c5f894709bbbc9bd03b1393e51f2d7f928730147304402200becfe203fe980e1cb6cabf95707f703eae34e1e3762da0ea20c7b87f22b2a13022001a9fe538da83aab586fa35208ba4b44cb9e13c99b831f4545bb011f2cf6b877014752210256d8f0fd650b3472961eeacde109abe8082168eaf4b5e79ab21a5e262f16115221038c75c1e5f487086f2ffc3ce6d3351fc62b9276a7e574deed94611d6e545472da52aeffffffff0280a90300000000001976a91417c420a3b5614d0074a97208086e0c0c32c7a86088acd03df1000000000017a914a715bd828e863b6a6b17542197c6e35a79542cf287000000000100000002944933c750a811a3910c7e86d1e9d73db91ec898d5bef6c09c59711de054752200000000db004830450221008802a3f451ddae3fff0dd1ae9646363b34b0bed8ba67e54368c1f265c6c57f6502205b06ffe24b34f1b47308b2fd5e00562db606b1e6d60455bc39741442d3c7893a0148304502210080d36baff50cc9f93651cccbf3a2a68a117a3441ac85ec370e67e0738a5943830220621ff4754d32426df330edda76069f61f391bec7baba2d7a46f4e37e03dc3de301475221024e6a4e25d8d5b48733834b9f3c2e1b54dd05b645c12236418c3a829cc858f49921038c75c1e5f487086f2ffc3ce6d3351fc62b9276a7e574deed94611d6e545472da52aeffffffff6ee8c379922c6aab61824a2302cb72a7af2862efd76702e51cb32b6c2320185701000000db00483045022100c95ed5201d07c1504d277dc54b4f6257a9c4a3db1e2707643bf411e623574a0702200e18608db2f713c459ba456b0dd371664ca8754ae25d3bec276b17dc1a98955b014830450221009a345be33a2cb9361c0b3f1daea7bcc5416be9807e4f0bc26fe7ea57d5387b48022028436185756d6f458b16a9d41c08fcdd5dd29b4d7563be2b628a56d2462f7a04014752210387a27911c996d797976b811e385de2bb1208003b7227c72ebd960d2bca4c3a3921038c75c1e5f487086f2ffc3ce6d3351fc62b9276a7e574deed94611d6e545472da52aeffffffff0200f91500000000001976a9143586b928a05af94f34308e9594fd74cac3fdc09888ac8ea228070000000017a914a2bd8e488614ad207612a7e3fbdb6a86de8743708700000000010000000130b263330b32e68b7d61b876c8e8e226014db19050f6044527370b5c61ed9c37000000008a4730440220260f58237361fcd81a1cd3bf47a80b8929a916d262fd27d0657081d4debf1d67022002f0a63d1a826a94e8eb85922ac85eee45d47917c59f30ae8f18e1bf8e21ac8d0141049de1c8260ad5729982fa9589f0aa795a76dbd9695418c232963098eac9c1a2b3c74669555f94f6e3fe7800916a8e30651dc7eefdb82e773bb096358420818d5affffffff0270fc4200000000001976a914f0dd368cc5ce378301947691548fb9b2c8a0b69088acd0a11000000000001976a914745701804bd627dffc357796b8148c3b13620ccb88ac0000000001000000018da6ef6b31e93e83bdbf79d5995d01c41656cc8ace165b4d2f901f11dad912cc000000008a47304402200f8340216198d1e2d1438a98ba929886a3c77c1f88d1bc61cca192658cc4ce4902203463555764ffb879b5d83c1d1c6d0c6f5c7394b4bdcdc0ba93d879d93537a3f00141049de1c8260ad5729982fa9589f0aa795a76dbd9695418c232963098eac9c1a2b3c74669555f94f6e3fe7800916a8e30651dc7eefdb82e773bb096358420818d5affffffff0270665b00000000001976a914f0dd368cc5ce378301947691548fb9b2c8a0b69088ac50bc1600000000001976a914745701804bd627dffc357796b8148c3b13620ccb88ac000000000100000001d097286bf6dc557c76514d242a97d480cb42ad3f05f10419e9058568e90a0efe060000008a473044022058a31866d9932962fd884ed718dc8b158572d047a5273074a5240113a20e0bbd022058c05391aa2a21ff469e546b50fd3572c645026cda861afa85f8f925038883470141049de1c8260ad5729982fa9589f0aa795a76dbd9695418c232963098eac9c1a2b3c74669555f94f6e3fe7800916a8e30651dc7eefdb82e773bb096358420818d5affffffff0234900000000000001976a914a414522ef134ecefed61431fbbd3f2bed5611d1088ac02b60200000000001976a914f0dd368cc5ce378301947691548fb9b2c8a0b69088ac00000000010000000198f5dc07c430cb60faec2e37bf8baac9e73ea6070574209ee33e4db79776afec070000008a47304402204ad9f22b1efa17c30998c54c0d7fef5ad88e4ee30c1e4944fdae8b688936dab8022019e251749b5e0f72cf8dd83e279ab42f812064ac26926f9243caf109a25d0d02014104ccc493c773ed7b190fd3fec0fde94df66605923b5ba6781968921e3f7c86060f62799e085a6873cc5dc1592e99a9090951cad28102cb920da361944d1a827916ffffffff02e0220200000000001976a91405147a48d37f67e905c567683eae30fa328b509588ac20300500000000001976a914f0dd368cc5ce378301947691548fb9b2c8a0b69088ac000000000100000001de081c389e168906e5e25f370c19c8abde8d635bb3ed189e291eb880c45c4825000000008a473044022000c7ef9649b39824f40ae02a86f7cacf2e1ffe7ad694b831227e44159829663a022006146182506f3286ea65c4907aa7ed04a1ca596c6a55926c187166bdf7f5b6650141049de1c8260ad5729982fa9589f0aa795a76dbd9695418c232963098eac9c1a2b3c74669555f94f6e3fe7800916a8e30651dc7eefdb82e773bb096358420818d5affffffff0250c30000000000001976a914fab6c49473e7e1e2e7d94ee069dde58dc1db4a4f88ac70820300000000001976a914f0dd368cc5ce378301947691548fb9b2c8a0b69088ac000000000100000001b94a7d764aa9667c5db0e7de14260d11a3e54b4e8ec4d4c6e6cfe3b19d4a15af000000008a47304402206c76418226c15687cc5f2f1505624fd8ea6d705f7bb6f386a1e5a24a69756b350220522db5ff043af184494e1fac9488be55791d8b82a28f5a963a8c84470a7791bc0141049de1c8260ad5729982fa9589f0aa795a76dbd9695418c232963098eac9c1a2b3c74669555f94f6e3fe7800916a8e30651dc7eefdb82e773bb096358420818d5affffffff0250c30000000000001976a914fab6c49473e7e1e2e7d94ee069dde58dc1db4a4f88ac70820300000000001976a914f0dd368cc5ce378301947691548fb9b2c8a0b69088ac0000000001000000013d99c1082fe149fd76479129daf7f4ff73d00b3af17e89b7263cccf2620815c3000000008a4730440220035df30539c9218340fa567b42e8a6eadac4ccbc587d79e72323d8bccf101add02205bfb410ca56b7d45bc83d0a97ae3b70340207331ad968310e2aea6ae362b611d0141049de1c8260ad5729982fa9589f0aa795a76dbd9695418c232963098eac9c1a2b3c74669555f94f6e3fe7800916a8e30651dc7eefdb82e773bb096358420818d5affffffff02f0e13c00000000001976a914f0dd368cc5ce378301947691548fb9b2c8a0b69088ac301b0f00000000001976a914745701804bd627dffc357796b8148c3b13620ccb88ac00000000';

function createWalletTransactions(walletTransactions, callback) {
  async.eachSeries(walletTransactions, createWalletTransaction, callback);

  function createWalletTransaction(walletTransactionParams, callback) {
    var walletTransaction = Model.WalletTransaction.create(walletTransactionParams);
    storage.storeWalletTransaction(walletTransaction, callback);
  }
}


describe('Storage', function() {
  before(function(done) {
    openDb(function() {
      storage = new Storage({
        db: db
      });
      done();
    });
  });
  beforeEach(function(done) {
    resetDb(done);
  });

  describe('Store & fetch wallet', function() {
    it('should correctly store and fetch wallet', function(done) {
      var wallet = Model.Wallet.create({
        id: '123',
        name: 'my wallet',
        m: 2,
        n: 3,
      });
      should.exist(wallet);
      storage.storeWallet(wallet, function(err) {
        should.not.exist(err);
        storage.fetchWallet('123', function(err, w) {
          should.not.exist(err);
          should.exist(w);
          w.id.should.equal(wallet.id);
          w.name.should.equal(wallet.name);
          w.m.should.equal(wallet.m);
          w.n.should.equal(wallet.n);
          done();
        });
      });
    });
    it('should not return error if wallet not found', function(done) {
      storage.fetchWallet('123', function(err, w) {
        should.not.exist(err);
        should.not.exist(w);
        done();
      });
    });
  });

  describe('Copayer lookup', function() {
    it('should correctly store and fetch copayer lookup', function(done) {
      var wallet = Model.Wallet.create({
        id: '123',
        name: 'my wallet',
        m: 2,
        n: 3,
      });
      _.each(_.range(3), function(i) {
        var copayer = Model.Copayer.create({
          name: 'copayer ' + i,
          xPubKey: 'xPubKey ' + i,
          requestPubKey: 'requestPubKey ' + i,
          signature: 'xxx',
        });
        wallet.addCopayer(copayer);
      });

      should.exist(wallet);
      storage.storeWalletAndUpdateCopayersLookup(wallet, function(err) {
        should.not.exist(err);
        storage.fetchCopayerLookup(wallet.copayers[1].id, function(err, lookup) {
          should.not.exist(err);
          should.exist(lookup);
          lookup.walletId.should.equal('123');
          lookup.requestPubKeys[0].key.should.equal('requestPubKey 1');
          lookup.requestPubKeys[0].signature.should.equal('xxx');
          done();
        });
      });
    });
    it('should not return error if copayer not found', function(done) {
      storage.fetchCopayerLookup('2', function(err, lookup) {
        should.not.exist(err);
        should.not.exist(lookup);
        done();
      });
    });
  });

  describe('Transaction proposals', function() {
    var wallet, proposals;

    beforeEach(function(done) {
      wallet = Model.Wallet.create({
        id: '123',
        name: 'my wallet',
        m: 2,
        n: 3,
      });
      _.each(_.range(3), function(i) {
        var copayer = Model.Copayer.create({
          name: 'copayer ' + i,
          xPubKey: 'xPubKey ' + i,
          requestPubKey: 'requestPubKey ' + i,
          signature: 'signarture ' + i,
        });
        wallet.addCopayer(copayer);
      });
      should.exist(wallet);
      storage.storeWalletAndUpdateCopayersLookup(wallet, function(err) {
        should.not.exist(err);

        proposals = _.map(_.range(4), function(i) {
          var tx = Model.TxProposalLegacy.create({
            walletId: '123',
            toAddress: '18PzpUFkFZE8zKWUPvfykkTxmB9oMR8qP7',
            creatorId: wallet.copayers[0].id,
            amount: i + 100,
          });
          if (i % 2 === 0) {
            tx.status = 'rejected';
            tx.isPending().should.be.false;
          }
          tx.txid = 'txid' + i;
          return tx;
        });
        async.each(proposals, function(tx, next) {
          storage.storeTx('123', tx, next);
        }, function(err) {
          should.not.exist(err);
          done();
        });
      });
    });
    it('should fetch tx', function(done) {
      storage.fetchTx('123', proposals[0].id, function(err, tx) {
        should.not.exist(err);
        should.exist(tx);
        tx.id.should.equal(proposals[0].id);
        tx.walletId.should.equal(proposals[0].walletId);
        tx.creatorName.should.equal('copayer 0');
        done();
      });
    });
    it('should fetch tx by hash', function(done) {
      storage.fetchTxByHash('txid0', function(err, tx) {
        should.not.exist(err);
        should.exist(tx);
        tx.id.should.equal(proposals[0].id);
        tx.walletId.should.equal(proposals[0].walletId);
        tx.creatorName.should.equal('copayer 0');
        done();
      });
    });

    it('should fetch all pending txs', function(done) {
      storage.fetchPendingTxs('123', function(err, txs) {
        should.not.exist(err);
        should.exist(txs);
        txs.length.should.equal(2);
        txs = _.sortBy(txs, 'amount');
        txs[0].amount.should.equal(101);
        txs[1].amount.should.equal(103);
        done();
      });
    });
    it('should remove tx', function(done) {
      storage.removeTx('123', proposals[0].id, function(err) {
        should.not.exist(err);
        storage.fetchTx('123', proposals[0].id, function(err, tx) {
          should.not.exist(err);
          should.not.exist(tx);
          storage.fetchTxs('123', {}, function(err, txs) {
            should.not.exist(err);
            should.exist(txs);
            txs.length.should.equal(3);
            _.any(txs, {
              id: proposals[0].id
            }).should.be.false;
            done();
          });
        });
      });
    });
  });

  describe('storeWalletTransaction', function() {
    it('should store the walletTransaction', function(done) {
      var params = {
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a8',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8',
        blockHeight: 12345,
        receiving: true,
        network: 'testnet'
      };

      var walletTransaction = Model.WalletTransaction.create(params);

      storage.storeWalletTransaction(walletTransaction, function(err) {
        if (err) {
          throw err;
        }
        should.not.exist(err);
        db.collection(Storage.collections.WALLET_TRANSACTIONS).find({}).toArray(function(err, walletTransactions) {
          if (err) {
            throw err;
          }
          should.not.exist(err);
          should.exist(walletTransactions);
          walletTransactions.length.should.equal(1);
          delete walletTransactions[0]._id; // we don't care about checking the _id
          walletTransactions[0].should.deep.equal(params);
          done();
        });
      });
    });

    it('should not create an extra document if called twice with the same arguments', function(done) {
      var params = {
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a8',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8',
        blockHeight: 12345,
        receiving: true,
        network: 'testnet'
      };

      var walletTransaction = Model.WalletTransaction.create(params);

      storage.storeWalletTransaction(walletTransaction, function(err) {
        should.not.exist(err);
        storage.storeWalletTransaction(walletTransaction, function(err) {
          should.not.exist(err);
          db.collection(Storage.collections.WALLET_TRANSACTIONS).find({}).toArray(function(err, walletTransactions) {
            should.not.exist(err);
            should.exist(walletTransactions);
            walletTransactions.length.should.equal(1);
            delete walletTransactions[0]._id; // we don't care about checking the _id
            walletTransactions[0].should.deep.equal(params);
            done();
          });
        });
      });
    });

    it('should be able to store both a receiving and sending version of the same tx', function(done) {
      var params1 = {
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a8',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8',
        blockHeight: 12345,
        receiving: true,
        network: 'testnet'
      };

      var params2 = {
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a8',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8',
        blockHeight: 12345,
        receiving: false,
        network: 'testnet'
      };

      var walletTransaction1 = Model.WalletTransaction.create(params1);
      var walletTransaction2 = Model.WalletTransaction.create(params2);

      storage.storeWalletTransaction(walletTransaction1, function(err) {
        should.not.exist(err);
        storage.storeWalletTransaction(walletTransaction2, function(err) {
          should.not.exist(err);
          db.collection(Storage.collections.WALLET_TRANSACTIONS).find({}).toArray(function(err, walletTransactions) {
            should.not.exist(err);
            should.exist(walletTransactions);
            walletTransactions.length.should.equal(2);
            delete walletTransactions[0]._id; // we don't care about checking the _id
            walletTransactions[0].should.deep.equal(params1);
            delete walletTransactions[1]._id; // we don't care about checking the _id
            walletTransactions[1].should.deep.equal(params2);
            done();
          });
        });
      });
    });

    it('should be able to store the same tx for 2 wallets', function(done) {
      var params1 = {
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a8',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8',
        blockHeight: 12345,
        receiving: true,
        network: 'testnet'
      };

      var params2 = {
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a9',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8',
        blockHeight: 12345,
        receiving: true,
        network: 'testnet'
      };

      var walletTransaction1 = Model.WalletTransaction.create(params1);
      var walletTransaction2 = Model.WalletTransaction.create(params2);

      storage.storeWalletTransaction(walletTransaction1, function(err) {
        should.not.exist(err);
        storage.storeWalletTransaction(walletTransaction2, function(err) {
          should.not.exist(err);
          db.collection(Storage.collections.WALLET_TRANSACTIONS).find({}).toArray(function(err, walletTransactions) {
            should.not.exist(err);
            should.exist(walletTransactions);
            walletTransactions.length.should.equal(2);
            delete walletTransactions[0]._id; // we don't care about checking the _id
            walletTransactions[0].should.deep.equal(params1);
            delete walletTransactions[1]._id; // we don't care about checking the _id
            walletTransactions[1].should.deep.equal(params2);
            done();
          });
        });
      });
    });
  });

  describe('findWalletTransactions', function() {
    before(function(done) {
      var WalletTransactions = Storage.collections.WALLET_TRANSACTIONS;
      storage.db.collection(WalletTransactions).remove({}, done);
    });

    after(function(done) {
      var WalletTransactions = Storage.collections.WALLET_TRANSACTIONS;
      storage.db.collection(WalletTransactions).remove({}, done);
    });

    it('should handle mongo error', function(done) {
      var sandbox = sinon.sandbox.create();

      var ta = sandbox.stub(Cursor.prototype, 'toArray', function(callback) {
        callback(new Error('this is an error'));
      });

      storage.findWalletTransactions('58b90ad7-454b-4df0-be99-ed4ede0be8a9', 0, 10, function(err, walletTransactions) {
        should.exist(err);
        should.not.exist(walletTransactions);
        err.should.be.an.instanceOf(Error);
        err.message.should.equal('this is an error');
        sandbox.restore();
        done();
      });
    });

    it('should find the transactions for this wallet id', function(done) {
      createWalletTransactions(TRANSACTION_PARAMS, function(err) {
        should.not.exist(err);
        storage.findWalletTransactions('58b90ad7-454b-4df0-be99-ed4ede0be8a9', 0, 10, function(err, walletTransactions) {
          should.not.exist(err);
          should.exist(walletTransactions);
          walletTransactions.should.deep.equal(TRANSACTIONS);
          done();
        });
      });
    });

    it('should find the transactions for this wallet id with different paging', function(done) {
      createWalletTransactions(TRANSACTION_PARAMS, function(err) {
        should.not.exist(err);
        storage.findWalletTransactions('58b90ad7-454b-4df0-be99-ed4ede0be8a9', 2, 2, function(err, walletTransactions) {
          should.not.exist(err);
          should.exist(walletTransactions);
          walletTransactions.should.deep.equal([
            TRANSACTIONS[2],
            TRANSACTIONS[3]
          ]);
          done();
        });
      });
    });

    it('should find the transactions for the other wallet id', function(done) {
      createWalletTransactions(TRANSACTION_PARAMS, function(err) {
        should.not.exist(err);
        storage.findWalletTransactions('58b90ad7-454b-4df0-be99-ed4ede0be8aa', 0, 10, function(err, walletTransactions) {
          should.not.exist(err);
          should.exist(walletTransactions);
          walletTransactions.should.deep.equal([
            Model.WalletTransaction.create(TRANSACTION_PARAMS[4])
          ]);
          done();
        });
      });
    });

    it('should find nothing for a wallet with no txs', function(done) {
      createWalletTransactions(TRANSACTION_PARAMS, function(err) {
        should.not.exist(err);
        storage.findWalletTransactions('58b90ad7-454b-4df0-be99-ed0000000000', 0, 10, function(err, walletTransactions) {
          should.not.exist(err);
          should.exist(walletTransactions);
          walletTransactions.should.deep.equal([]);
          done();
        });
      });
    });
  });

  describe('removeWalletTransactionsAtBlockHeight', function() {
    var WalletTransactions = Storage.collections.WALLET_TRANSACTIONS;
    beforeEach(function(done) {
      storage.db.collection(WalletTransactions).remove({}, done);
    });

    after(function(done) {
      storage.db.collection(WalletTransactions).remove({}, done);
    });

    it('should handle mongo error', function(done) {
      var sandbox = sinon.sandbox.create();

      var re = sandbox.stub(storage.db.collection(WalletTransactions), 'remove', function(query, callback) {
        callback(new Error('this is an error'));
      });

      storage.removeWalletTransactionsAtBlockHeight(4, 'testnet', function(err) {
        should.exist(err);
        err.should.be.an.instanceOf(Error);
        err.message.should.equal('this is an error');
        re.callCount.should.equal(1);
        sandbox.restore();
        done();
      });
    });

    it('should remove the walletTransactions at the given block height', function(done) {
      createWalletTransactions(TRANSACTION_PARAMS, function(err) {
        should.not.exist(err);
        storage.removeWalletTransactionsAtBlockHeight(4, 'testnet', function(err) {
          should.not.exist(err);
          storage.db.collection(WalletTransactions).find().toArray(function(err, walletTransactions) {
            should.not.exist(err);
            walletTransactions.length.should.equal(3);
            delete walletTransactions[0]._id;
            delete walletTransactions[1]._id;
            delete walletTransactions[2]._id;
            walletTransactions.should.deep.equal([
              TRANSACTION_PARAMS[0],
              TRANSACTION_PARAMS[1],
              TRANSACTION_PARAMS[2]
            ]);
            done();
          });
        });
      });
    });

    it('should not remove any transactions if there are none at the given block height', function(done) {
      createWalletTransactions(TRANSACTION_PARAMS, function(err) {
        should.not.exist(err);
        storage.removeWalletTransactionsAtBlockHeight(99999999999999999, 'testnet', function(err) {
          should.not.exist(err);
          storage.db.collection(WalletTransactions).count(function(err, count) {
            should.not.exist(err);
            should.exist(count);
            count.should.equal(TRANSACTION_PARAMS.length);
            done();
          });
        });
      });
    });

    it('should not remove an documents when called with a different network', function(done) {
      createWalletTransactions(TRANSACTION_PARAMS, function(err) {
        should.not.exist(err);
        storage.removeWalletTransactionsAtBlockHeight(4, 'livenet', function(err) {
          should.not.exist(err);
          storage.db.collection(WalletTransactions).count(function(err, count) {
            should.not.exist(err);
            should.exist(count);
            count.should.equal(TRANSACTION_PARAMS.length);
            done();
          });
        });
      });
    });
  });

  describe('getLatestBlock', function() {
    var Blocks = Storage.collections.BLOCKS;
    beforeEach(function(done) {
      storage.db.collection(Blocks).remove({}, done);
    });

    after(function(done) {
      storage.db.collection(Blocks).remove({}, done);
    });

    it('should handle mongo error', function(done) {
      var sandbox = sinon.sandbox.create();

      var ta = sandbox.stub(Cursor.prototype, 'toArray', function(callback) {
        callback(new Error('this is an error'));
      });

      storage.getLatestBlock('livenet', function(err) {
        should.exist(err);
        err.should.be.an.instanceOf(Error);
        err.message.should.equal('this is an error');
        ta.callCount.should.equal(1);
        sandbox.restore();
        done();
      });
    });

    it('should get the latest block', function(done) {
      storage.db.collection(Blocks).insert(BLOCK_PARAMS, function(err) {
        should.not.exist(err);
        storage.getLatestBlock('testnet', function(err, block) {
          should.not.exist(err);
          should.exist(block);
          block.should.deep.equal(BLOCKS[0]);
          done();
        });
      });
    });

    it('should get nothing if called with a different network', function(done) {
      storage.db.collection(Blocks).insert(BLOCK_PARAMS, function(err) {
        should.not.exist(err);
        storage.getLatestBlock('livenet', function(err, block) {
          should.not.exist(err);
          should.not.exist(block);
          done();
        });
      });
    });

    it('should get nothing if there are no blocks in the db', function(done) {
      storage.getLatestBlock('livenet', function(err, block) {
        should.not.exist(err);
        should.not.exist(block);
        done();
      });
    });
  });

  describe('deleteBlock', function() {
    var Blocks = Storage.collections.BLOCKS;
    beforeEach(function(done) {
      storage.db.collection(Blocks).remove({}, done);
    });

    after(function(done) {
      storage.db.collection(Blocks).remove({}, done);
    });

    it('should handle mongo error', function(done) {
      var sandbox = sinon.sandbox.create();

      var re = sandbox.stub(storage.db.collection(Blocks), 'remove', function(query, callback) {
        callback(new Error('this is an error'));
      });

      storage.deleteBlock(4, 'testnet', function(err) {
        should.exist(err);
        err.should.be.an.instanceOf(Error);
        err.message.should.equal('this is an error');
        re.callCount.should.equal(1);
        sandbox.restore();
        done();
      });
    });

    it('should delete the block at the given block height', function(done) {
      storage.db.collection(Blocks).insert(BLOCK_PARAMS, function(err) {
        should.not.exist(err);
        storage.deleteBlock(3, 'testnet', function(err) {
          should.not.exist(err);
          storage.db.collection(Blocks).findOne({height: 3}, function(err, block) {
            should.not.exist(err);
            should.not.exist(block);
            storage.db.collection(Blocks).count({}, function(err, count) {
              should.not.exist(err);
              count.should.equal(BLOCK_PARAMS.length - 1);
              done();
            });
          });
        });
      });
    });

    it('should not delete the block if called with a differen network', function(done) {
      storage.db.collection(Blocks).insert(BLOCK_PARAMS, function(err) {
        should.not.exist(err);
        storage.deleteBlock(3, 'livenet', function(err) {
          should.not.exist(err);
          storage.db.collection(Blocks).findOne({height: 3}, function(err, block) {
            should.not.exist(err);
            should.exist(block);
            storage.db.collection(Blocks).count({}, function(err, count) {
              should.not.exist(err);
              count.should.equal(BLOCK_PARAMS.length);
              done();
            });
          });
        });
      });
    });
  });

  describe('finishBlock', function() {
    var Blocks = Storage.collections.BLOCKS;
    beforeEach(function(done) {
      storage.db.collection(Blocks).remove({}, done);
    });

    after(function(done) {
      storage.db.collection(Blocks).remove({}, done);
    });

    it('should handle mongo error', function(done) {
      var sandbox = sinon.sandbox.create();

      var up = sandbox.stub(storage.db.collection(Blocks), 'update', function(query, update, callback) {
        callback(new Error('this is an error'));
      });

      storage.finishBlock(4, 'testnet', function(err) {
        should.exist(err);
        err.should.be.an.instanceOf(Error);
        err.message.should.equal('this is an error');
        up.callCount.should.equal(1);
        sandbox.restore();
        done();
      });
    });

    it('should set finished to true on a "removing" block', function(done) {
      storage.db.collection(Blocks).insert(BLOCK_PARAMS, function(err) {
        should.not.exist(err);
        storage.db.collection(Blocks).update({height: 4}, {$set: {action: 'removing', finished: false}}, function(err) {
          should.not.exist(err);
          storage.finishBlock(4, 'testnet', function(err) {
            should.not.exist(err);
            storage.db.collection(Blocks).findOne({height: 4}, function(err, block) {
              should.not.exist(err);
              should.exist(block);
              block.finished.should.equal(true);
              done();
            });
          });
        });
      });
    });

    it('should set finished to true on an "adding" block', function(done) {
      storage.db.collection(Blocks).insert(BLOCK_PARAMS, function(err) {
        should.not.exist(err);
        storage.db.collection(Blocks).update({height: 4}, {$set: {action: 'adding', finished: false}}, function(err) {
          should.not.exist(err);
          storage.finishBlock(4, 'testnet', function(err) {
            should.not.exist(err);
            storage.db.collection(Blocks).findOne({height: 4}, function(err, block) {
              should.not.exist(err);
              should.exist(block);
              block.finished.should.equal(true);
              done();
            });
          });
        });
      });
    });

    it('should do nothing if called with a differen network', function(done) {
      storage.db.collection(Blocks).insert(BLOCK_PARAMS, function(err) {
        should.not.exist(err);
        storage.db.collection(Blocks).update({height: 4}, {$set: {action: 'adding', finished: false}}, function(err) {
          should.not.exist(err);
          storage.finishBlock(4, 'livenet', function(err) {
            should.not.exist(err);
            storage.db.collection(Blocks).findOne({height: 4}, function(err, block) {
              should.not.exist(err);
              should.exist(block);
              block.finished.should.equal(false);
              done();
            });
          });
        });
      });
    });
  });

  describe('startRemovingBlock', function() {
    var Blocks = Storage.collections.BLOCKS;
    beforeEach(function(done) {
      storage.db.collection(Blocks).remove({}, done);
    });

    after(function(done) {
      storage.db.collection(Blocks).remove({}, done);
    });

    it('should handle mongo error', function(done) {
      var sandbox = sinon.sandbox.create();

      var up = sandbox.stub(storage.db.collection(Blocks), 'update', function(query, update, callback) {
        callback(new Error('this is an error'));
      });

      storage.startRemovingBlock(4, 'testnet', function(err) {
        should.exist(err);
        err.should.be.an.instanceOf(Error);
        err.message.should.equal('this is an error');
        up.callCount.should.equal(1);
        sandbox.restore();
        done();
      });
    });

    it('should set action to "removing" and finished to false', function(done) {
      storage.db.collection(Blocks).insert(BLOCK_PARAMS, function(err) {
        should.not.exist(err);
        storage.startRemovingBlock(4, 'testnet', function(err) {
          should.not.exist(err);
          storage.db.collection(Blocks).findOne({height: 4}, function(err, block) {
            should.not.exist(err);
            should.exist(block);
            block.action.should.equal('removing');
            block.finished.should.equal(false);
            done();
          });
        });
      });
    });

    it('should do nothing if called with a different network', function(done) {
      var blockParam = {
        height: 4,
        hash: '000000004ebadb55ee9096c9a2f8880e09da59c0d68b1c228da88e48844a1485',
        previousHash: '0000000082b5015589a3fdf2d4baff403e6f0be035a5d9742c1cae6295464449',
        network: 'testnet',
        action: 'adding',
        finished: true
      };

      storage.db.collection(Blocks).insert(blockParam, function(err) {
        should.not.exist(err);
        storage.startRemovingBlock(4, 'livenet', function(err) {
          should.not.exist(err);
          storage.db.collection(Blocks).findOne({height: 4}, function(err, block) {
            should.not.exist(err);
            should.exist(block);
            block.action.should.equal('adding');
            block.finished.should.equal(true);
            done();
          });
        });
      });
    });
  });

  describe('addBlock', function() {
    var Blocks = Storage.collections.BLOCKS;
    beforeEach(function(done) {
      storage.db.collection(Blocks).remove({}, done);
    });

    after(function(done) {
      storage.db.collection(Blocks).remove({}, done);
    });

    it('should handle mongo error', function(done) {
      var sandbox = sinon.sandbox.create();

      var up = sandbox.stub(storage.db.collection(Blocks), 'update', function(query, update, options, callback) {
        callback(new Error('this is an error'));
      });

      var bitcoreBlock = bitcore.Block.fromString(RAW_BLOCK_HEX);
      bitcoreBlock.height = 406016;

      storage.addBlock(bitcoreBlock, 'livenet', function(err) {
        should.exist(err);
        err.should.be.an.instanceOf(Error);
        err.message.should.equal('this is an error');
        up.callCount.should.equal(1);
        sandbox.restore();
        done();
      });
    });

    it('should add a new block', function(done) {
      var bitcoreBlock = bitcore.Block.fromString(RAW_BLOCK_HEX);
      bitcoreBlock.height = 406016;

      storage.addBlock(bitcoreBlock, 'livenet', function(err) {
        should.not.exist(err);
        storage.db.collection(Blocks).findOne({height: 406016}, function(err, block) {
          should.not.exist(err);
          should.exist(block);
          delete block._id;
          block.should.deep.equal({
            hash: '000000000000000000dcdef6f6ce78f882da11d16e1bef4d0bf5affaf7acf501',
            previousHash: '000000000000000004da3b4a07c9e93117e1fe19dec422d82dc801b465b636ff',
            height: 406016,
            action: 'adding',
            finished: false,
            network: 'livenet'
          });
          done();
        });
      });
    });

    it('should not add an extra block if addBlock is called twice with the same arguments', function(done) {
      var bitcoreBlock = bitcore.Block.fromString(RAW_BLOCK_HEX);
      bitcoreBlock.height = 406016;

      storage.addBlock(bitcoreBlock, 'livenet', function(err) {
        should.not.exist(err);
        storage.addBlock(bitcoreBlock, 'livenet', function(err) {
          should.not.exist(err);
          storage.db.collection(Blocks).find({height: 406016}).toArray(function(err, blocks) {
            should.not.exist(err);
            should.exist(blocks);
            blocks.length.should.equal(1);
            delete blocks[0]._id;
            blocks[0].should.deep.equal({
              hash: '000000000000000000dcdef6f6ce78f882da11d16e1bef4d0bf5affaf7acf501',
              previousHash: '000000000000000004da3b4a07c9e93117e1fe19dec422d82dc801b465b636ff',
              height: 406016,
              action: 'adding',
              finished: false,
              network: 'livenet'
            });
            done();
          });
        });
      });
    });
  });
});
