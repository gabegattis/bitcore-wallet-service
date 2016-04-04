'use strict';

var _ = require('lodash');
var async = require('async');
var chai = require('chai');
var sinon = require('sinon');
var should = chai.should();
var tingodb = require('tingodb')({
  memStore: true
});

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
        blockHeight: 12345
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
  });

  describe('findWalletTransaction', function() {
    var transactionParams = [
      {
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a9',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff9',
        blockHeight: 3
      },
      {
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a9',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff0',
        blockHeight: 2
      },
      {
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a9',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff1',
        blockHeight: 1
      },
      {
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a9',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8',
        blockHeight: 4
      },
      {
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8aa',//different id, should not be in results
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ffa',
        blockHeight: 4
      }
    ];

    var transactions = [
      Model.WalletTransaction.create(transactionParams[3]), // height 4
      Model.WalletTransaction.create(transactionParams[0]), // height 3
      Model.WalletTransaction.create(transactionParams[1]), // height 2
      Model.WalletTransaction.create(transactionParams[2]), // height 1
    ];

    function createWalletTransactions(walletTransactions, callback) {
      async.eachSeries(walletTransactions, createWalletTransaction, callback);

      function createWalletTransaction(walletTransactionParams, callback) {
        var walletTransaction = Model.WalletTransaction.create(walletTransactionParams);
        storage.storeWalletTransaction(walletTransaction, callback);
      }
    }

    it('should handle mongo error', function(done) {
      var sandbox = sinon.sandbox.create();

      var Cursor = require('../node_modules/tingodb/lib/tcursor');

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
      createWalletTransactions(transactionParams, function(err) {
        should.not.exist(err);
        storage.findWalletTransactions('58b90ad7-454b-4df0-be99-ed4ede0be8a9', 0, 10, function(err, walletTransactions) {
          should.not.exist(err);
          should.exist(walletTransactions);
          walletTransactions.should.deep.equal(transactions);
          done();
        });
      });
    });

    it('should find the transactions for this wallet id with different paging', function(done) {
      createWalletTransactions(transactionParams, function(err) {
        should.not.exist(err);
        storage.findWalletTransactions('58b90ad7-454b-4df0-be99-ed4ede0be8a9', 2, 2, function(err, walletTransactions) {
          should.not.exist(err);
          should.exist(walletTransactions);
          walletTransactions.should.deep.equal([
            transactions[2],
            transactions[3]
          ]);
          done();
        });
      });
    });

    it('should find the transactions for the other wallet id', function(done) {
      createWalletTransactions(transactionParams, function(err) {
        should.not.exist(err);
        storage.findWalletTransactions('58b90ad7-454b-4df0-be99-ed4ede0be8aa', 0, 10, function(err, walletTransactions) {
          should.not.exist(err);
          should.exist(walletTransactions);
          walletTransactions.should.deep.equal([
            Model.WalletTransaction.create(transactionParams[4])
          ]);
          done();
        });
      });
    });

    it('should find nothing for a wallet with no txs', function(done) {
      createWalletTransactions(transactionParams, function(err) {
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
});
