'use strict';

var chai = require('chai');
var should = chai.should();
var sinon = require('sinon');
var bitcore = require('bitcore-lib');

var WalletTransaction = require('../../lib/model/walletTransaction');

describe('WalletTransaction', function() {
  describe('create', function() {
    var sandbox;
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should throw an error if the input validation fails', function() {
      sandbox.stub(WalletTransaction, '_validateOptions', function() {
        throw new Error('this is an error');
      });

      function create() {
        WalletTransaction.create({bad: 'params'});
      }

      create.should.throw(Error, 'this is an error');
    });

    it('should create a new walletTransction', function() {
      var params = {
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a8',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8',
        blockHeight: 12345,
        receiving: false,
        network: 'testnet'
      };

      var walletTransaction = WalletTransaction.create(params);

      should.exist(walletTransaction);
      walletTransaction.should.be.an.instanceOf(WalletTransaction);
      walletTransaction.address.should.equal(params.address);
      walletTransaction.walletId.should.equal(params.walletId);
      walletTransaction.txid.should.equal(params.txid);
      walletTransaction.blockHeight.should.equal(params.blockHeight);
    });
  });

  describe('_validateOptions', function() {
    it('should throw if params is null', function() {
      var params = null;

      function validate() {
        WalletTransaction._validateOptions(params);
      }

      validate.should.throw(Error);
    });

    it('should throw if params is undefined', function() {
      function validate() {
        WalletTransaction._validateOptions();
      }

      validate.should.throw(Error);
    });
  });

  describe('_validateAddress', function() {
    it('should throw if no address', function() {
      function validate() {
        WalletTransaction._validateAddress(undefined, 'livenet');
      }

      validate.should.throw(Error, 'address is a required parameter');
    });

    it('should throw if address is not a string', function() {
      function validate() {
        WalletTransaction._validateAddress(123456, 'testnet');
      }

      validate.should.throw(Error, 'address must be a string');
    });

    it('should throw if throw if address is invalid', function() {
      function validate() {
        WalletTransaction._validateAddress('thisIsNotABitcoinAddress', 'testnet');
      }

      validate.should.throw(Error, 'invalid address');
    });

    it('should allow a testnet address', function() {
      WalletTransaction._validateAddress('mx6sbEmboZW2LfngaTE2zDY925yothVB5p', 'testnet');
    });

    it('should allow a testnet p2sh address', function() {
      WalletTransaction._validateAddress('2Mx3TZycg4XL5sQFfERBgNmg9Ma7uxowK9y', 'testnet');
    });

    it('should allow a livenet address', function() {
      WalletTransaction._validateAddress('1GVEUcQUVSekkK9k9CSLMyDatTQUncVMPP', 'livenet');
    });

    it('should allow a livenet p2sh address', function() {
      WalletTransaction._validateAddress('36myJEA85CzDE229AbFifdP2rPdX2FGbSq', 'livenet');
    });

    it('should throw if throw if given a valid address but the wrong network', function() {
      function validate() {
        WalletTransaction._validateAddress('1GVEUcQUVSekkK9k9CSLMyDatTQUncVMPP', 'testnet');
      }

      validate.should.throw(Error, 'invalid address');
    });

    it('should allow an address from an added network', function() {
      var basketballNet = {
        name: 'basketballnet',
        alias: 'basketballnet',
        pubkeyhash: 0x23, // different value here gives us different looking address
        privatekey: 0xef,
        scripthash: 0xc4,
        xpubkey: 0x043587cf,
        xprivkey: 0x04358394,
        networkMagic: 0x000ba11a,
        port: 18333,
        dnsSeeds: [
          'basketballnet-seed.bitcoin.petertodd.org',
          'basketballnet-seed.bluematt.me',
          'basketballnet-seed.alexykot.me',
          'basketballnet-seed.bitcoin.schildbach.de'
        ]
      };

      bitcore.Networks.add(basketballNet);

      var address = 'FTNQFU5YV2ydNdPgTtWjfZNPGRYCoYUtfE';
      WalletTransaction._validateAddress(address, 'basketballnet');
      bitcore.Networks.remove(bitcore.Networks.get('basketballnet'));
    });
  });

  describe('_validateWalletId', function() {
    it('should throw if no walletId', function() {
      function validate() {
        WalletTransaction._validateWalletId();
      }

      validate.should.throw(Error, 'walletId is a required parameter');
    });

    it('should throw if walletId is not a string', function() {
      function validate() {
        WalletTransaction._validateWalletId(123456);
      }

      validate.should.throw(Error, 'walletId must be a string');
    });

    it('should allow a valid v4 uuid as walletId', function() {
      WalletTransaction._validateWalletId('f4ccbf13-1162-419c-9f79-d9c4b7771e87');
    });
  });

  describe('validateTxid', function() {
    it('should throw if no txid', function() {
      function validate() {
        WalletTransaction._validateTxid();
      }

      validate.should.throw(Error, 'txid is a required parameter');
    });

    it('should throw if txid is not a string', function() {
      function validate() {
        WalletTransaction._validateTxid(11234);
      }

      validate.should.throw(Error, 'txid must be a string');
    });

    it('should throw if txid is to short', function() {
      function validate() {
        WalletTransaction._validateTxid('2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff');
      }

      validate.should.throw(Error, 'invalid txid');
    });

    it('should throw if txid is too long', function() {
      function validate() {
        WalletTransaction._validateTxid('2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff89');
      }

      validate.should.throw(Error, 'invalid txid');
    });

    it('should throw if txid is not lowercase hex', function() {
      function validate() {
        WalletTransaction._validateTxid('2EEd0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8');
      }

      validate.should.throw(Error, 'invalid txid');
    });

    it('should allow a valid txid', function() {
      WalletTransaction._validateTxid('2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8');
    });
  });

  describe('_validateBlockHeight', function() {
    it('should throw if no blockHeight', function() {
      function validate() {
        WalletTransaction._validateBlockHeight();
      }

      validate.should.throw(Error, 'blockHeight is a required parameter');
    });

    it('should throw if blockHeight is not a number', function() {
      function validate() {
        WalletTransaction._validateBlockHeight('hello world');
      }

      validate.should.throw(Error, 'blockHeight must be a number');
    });

    it('should throw if blockHeight is NaN', function() {
      function validate() {
        WalletTransaction._validateBlockHeight(NaN);
      }

      validate.should.throw(Error, 'invalid blockHeight');
    });

    it('should throw if blockHeight is negative', function() {
      function validate() {
        WalletTransaction._validateBlockHeight(-1);
      }

      validate.should.throw(Error, 'invalid blockHeight');
    });

    it('should throw if blockHeight is infinity', function() {
      function validate() {
        WalletTransaction._validateBlockHeight(Infinity);
      }

      validate.should.throw(Error, 'invalid blockHeight');
    });

    it('should throw if blockHeight is not an integer', function() {
      function validate() {
        WalletTransaction._validateBlockHeight(12345.6789);
      }

      validate.should.throw(Error, 'invalid blockHeight');
    });

    it('should allow 0 blockHeight (genesis block)', function() {
      WalletTransaction._validateBlockHeight(0);
    });

    it('should allow positive blockHeight', function() {
      WalletTransaction._validateBlockHeight(1);
    });
  });

  describe('_validateReceiving', function() {
    it('should accept true', function() {
      WalletTransaction._validateReceiving(true);
    });

    it('should accept false', function() {
      WalletTransaction._validateReceiving(false);
    });

    it('should throw if receiving is "true"', function() {
      function validate() {
        WalletTransaction._validateReceiving('true');
      }

      validate.should.throw(Error, 'receiving must be a boolean');
    });

    it('should throw if receiving is "false"', function() {
      function validate() {
        WalletTransaction._validateReceiving('false');
      }

      validate.should.throw(Error, 'receiving must be a boolean');
    });

    it('should throw if receiving is a number', function() {
      function validate() {
        WalletTransaction._validateReceiving(21);
      }

      validate.should.throw(Error, 'receiving must be a boolean');
    });

    it('should throw if receiving is a string', function() {
      function validate() {
        WalletTransaction._validateReceiving('foo');
      }

      validate.should.throw(Error, 'receiving must be a boolean');
    });

    it('should throw if receiving is null', function() {
      function validate() {
        WalletTransaction._validateReceiving(null);
      }

      validate.should.throw(Error, 'receiving must be a boolean');
    });

    it('should throw if receiving is undefined', function() {
      function validate() {
        WalletTransaction._validateReceiving(undefined);
      }

      validate.should.throw(Error, 'receiving must be a boolean');
    });

    it('should throw if receiving is {}', function() {
      function validate() {
        WalletTransaction._validateReceiving({});
      }

      validate.should.throw(Error, 'receiving must be a boolean');
    });
  });

  describe('_validateNetwork', function() {
    it('should throw if no network', function() {
      function validate() {
        WalletTransaction._validateNetwork();
      }

      validate.should.throw(Error, 'network is a required parameter');
    });

    it('should allow "livenet"', function() {
      WalletTransaction._validateNetwork('livenet');
    });

    it('should allow "mainnet"', function() {
      WalletTransaction._validateNetwork('mainnet');
    });

    it('should allow "testnet"', function() {
      WalletTransaction._validateNetwork('testnet');
    });

    it('should throw with invalid network', function() {
      function validate() {
        WalletTransaction._validateNetwork('basketballnet');
      }

      validate.should.throw(Error, 'invalid network');
    });

    it('should throw if network is a bitcore network object (not a string)', function() {
      function validate() {
        var testnet = bitcore.Networks.get('testnet');
        WalletTransaction._validateNetwork(testnet);
      }

      validate.should.throw(Error, 'network must be a string');
    });

    it('should allow added network', function() {
      var basketballNet = {
        name: 'basketballnet',
        alias: 'basketballnet',
        pubkeyhash: 0x6f,
        privatekey: 0xef,
        scripthash: 0xc4,
        xpubkey: 0x043587cf,
        xprivkey: 0x04358394,
        networkMagic: 0x0b110907,
        port: 18333,
        dnsSeeds: [
          'basketballnet-seed.bitcoin.petertodd.org',
          'basketballnet-seed.bluematt.me',
          'basketballnet-seed.alexykot.me',
          'basketballnet-seed.bitcoin.schildbach.de'
        ]
      };

      bitcore.Networks.add(basketballNet);

      WalletTransaction._validateNetwork('basketballnet');
      bitcore.Networks.remove(bitcore.Networks.get('basketballnet'));
    });
  });

  describe('toObject', function() {
    it('should create a simple object from the walletTransaction', function() {
      var walletTransaction = WalletTransaction.create({
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a8',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8',
        blockHeight: 12345,
        receiving: true,
        network: 'testnet'
      });

      var object = walletTransaction.toObject();

      object.should.not.equal(walletTransaction);
      object.should.deep.equal({
        address: 'mt3yHNTkWSgP6abwHcRQwzk8Ef4Y6m5eaL',
        walletId: '58b90ad7-454b-4df0-be99-ed4ede0be8a8',
        txid: '2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8',
        blockHeight: 12345,
        receiving: true,
        network: 'testnet'
      });
    });
  });
});
