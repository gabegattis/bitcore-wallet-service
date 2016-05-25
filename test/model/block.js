'use strict';

var chai = require('chai');
var should = chai.should();
var sinon = require('sinon');
var bitcore = require('bitcore-lib');

var Block = require('../../lib/model/block');

describe('Block', function() {
  describe('create', function() {
    var sandbox;
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should throw an error if the input validation fails', function() {
      sandbox.stub(Block, '_validateOptions', function() {
        throw new Error('this is an error');
      });

      function create() {
        Block.create({bad: 'params'});
      }

      create.should.throw(Error, 'this is an error');
    });

    it('should create a new walletTransction', function() {
      var params = {
        hash: '0000000000000000059ad0d7e9dd0997533598882011cd5c047871a16b1a6ea7',
        previousHash: '000000000000000000cd925927aa1f8efa86a188dafe467eb0f535c8150fc041',
        height: 406831,
        network: 'livenet'
      };

      var block = Block.create(params);

      should.exist(block);
      block.should.be.an.instanceOf(Block);
      block.hash.should.equal(params.hash);
      block.previousHash.should.equal(params.previousHash);
      block.height.should.equal(params.height);
    });
  });

  describe('_validateOptions', function() {
    it('should throw if params is null', function() {
      var params = null;

      function validate() {
        Block._validateOptions(params);
      }

      validate.should.throw(Error);
    });

    it('should throw if params is undefined', function() {
      function validate() {
        Block._validateOptions();
      }

      validate.should.throw(Error);
    });

    it('should throw if options for the genesis block includes previousHash', function() {
      var options = {
        hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
        previousHash: '000000000000000000cd925927aa1f8efa86a188dafe467eb0f535c8150fc041',
        height: 0,
        network: 'livenet'
      };

      function validate() {
        Block._validateOptions(options);
      }

      validate.should.throw(Error, 'the genesis block should have no previousHash');
    });

    it('should throw if hash and previousHash are the same', function() {
      var options = {
        hash: '0000000000000000059ad0d7e9dd0997533598882011cd5c047871a16b1a6ea7',
        previousHash: '0000000000000000059ad0d7e9dd0997533598882011cd5c047871a16b1a6ea7',
        height: 406831,
        network: 'livenet'
      };

      function validate() {
        Block._validateOptions(options);
      }

      validate.should.throw(Error, 'hash and previousHash must not be the same');
    });
  });

  describe('_validateHash', function() {
    it('throw for an invalid hash', function() {
      function validate() {
        Block._validateHash('this is invalid');
      }

      validate.should.throw(Error);
    });

    it('should accept a valid hash', function() {
      Block._validateHash('0000000000000000059ad0d7e9dd0997533598882011cd5c047871a16b1a6ea7');
    });
  });

  describe('_validatePreviousHash', function() {
    it('throw for an invalid hash', function() {
      function validate() {
        Block._validatePreviousHash('this is invalid');
      }

      validate.should.throw(Error);
    });

    it('should accept a valid hash', function() {
      Block._validatePreviousHash('0000000000000000059ad0d7e9dd0997533598882011cd5c047871a16b1a6ea7');
    });
  });

  describe('_validateBlockHash', function() {
    it('should throw if no hash', function() {
      function validate() {
        Block._validateBlockHash();
      }

      validate.should.throw(Error, 'hash is a required parameter');
    });

    it('should throw if hash is not a string', function() {
      function validate() {
        Block._validateBlockHash(11234);
      }

      validate.should.throw(Error, 'hash must be a string');
    });

    it('should throw if hash is to short', function() {
      function validate() {
        Block._validateBlockHash('2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff');
      }

      validate.should.throw(Error, 'invalid hash');
    });

    it('should throw if hash is too long', function() {
      function validate() {
        Block._validateBlockHash('2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff89');
      }

      validate.should.throw(Error, 'invalid hash');
    });

    it('should throw if hash is not lowercase hex', function() {
      function validate() {
        Block._validateBlockHash('2EEd0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8');
      }

      validate.should.throw(Error, 'invalid hash');
    });

    it('should allow a valid hash', function() {
      Block._validateBlockHash('2eed0538ef9d83b4906901069247f494daf1d45fa22df287ac329af1802e3ff8');
    });
  });

  describe('_validateHeight', function() {
    it('should throw if no height', function() {
      function validate() {
        Block._validateHeight();
      }

      validate.should.throw(Error, 'height is a required parameter');
    });

    it('should throw if blockHeight is not a number', function() {
      function validate() {
        Block._validateHeight('hello world');
      }

      validate.should.throw(Error, 'height must be a number');
    });

    it('should throw if blockHeight is NaN', function() {
      function validate() {
        Block._validateHeight(NaN);
      }

      validate.should.throw(Error, 'invalid height');
    });

    it('should throw if blockHeight is negative', function() {
      function validate() {
        Block._validateHeight(-1);
      }

      validate.should.throw(Error, 'invalid height');
    });

    it('should throw if blockHeight is infinity', function() {
      function validate() {
        Block._validateHeight(Infinity);
      }

      validate.should.throw(Error, 'invalid height');
    });

    it('should throw if blockHeight is not an integer', function() {
      function validate() {
        Block._validateHeight(12345.6789);
      }

      validate.should.throw(Error, 'invalid height');
    });

    it('should allow 0 height (genesis block)', function() {
      Block._validateHeight(0);
    });

    it('should allow positive height', function() {
      Block._validateHeight(1);
    });
  });

  describe('_validateNetwork', function() {
    it('should throw if no network', function() {
      function validate() {
        Block._validateNetwork();
      }

      validate.should.throw(Error, 'network is a required parameter');
    });

    it('should allow "livenet"', function() {
      Block._validateNetwork('livenet');
    });

    it('should allow "mainnet"', function() {
      Block._validateNetwork('mainnet');
    });

    it('should allow "testnet"', function() {
      Block._validateNetwork('testnet');
    });

    it('should throw with invalid network', function() {
      function validate() {
        Block._validateNetwork('basketballnet');
      }

      validate.should.throw(Error, 'invalid network');
    });

    it('should throw if network is a bitcore network object (not a string)', function() {
      function validate() {
        var testnet = bitcore.Networks.get('testnet');
        Block._validateNetwork(testnet);
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

      Block._validateNetwork('basketballnet');
      bitcore.Networks.remove(bitcore.Networks.get('basketballnet'));
    });
  });

  describe('_validateAction', function() {
    it('should allow undefined', function() {
      Block._validateAction();
    });

    it('should allow "adding"', function() {
      Block._validateAction('adding');
    });

    it('should allow "removing"', function() {
      Block._validateAction('removing');
    });

    it('should throw with invalid action', function() {
      function validate() {
        Block._validateAction('thisIsNotAnAction');
      }

      validate.should.throw(Error, 'invalid action');
    });

    it('should throw with non-string values', function() {
      var values = [
        null,
        true,
        12345,
        {},
        [],
        new Date()
      ];

      function validate(value) {
        return function() {
          Block._validateAction(value);
        };
      }

      for (var i = 0; i < values.length; i++) {
        var value = values[i];
        validate(value).should.throw(Error, 'action must be a string');
      }
    });
  });

  describe('_validateFinished', function() {
    it('should accept true', function() {
      Block._validateFinished(true);
    });

    it('should accept false', function() {
      Block._validateFinished(false);
    });

    it('should throw if finished is "true"', function() {
      function validate() {
        Block._validateFinished('true');
      }

      validate.should.throw(Error, 'finished must be a boolean');
    });

    it('should throw if finished is "false"', function() {
      function validate() {
        Block._validateFinished('false');
      }

      validate.should.throw(Error, 'finished must be a boolean');
    });

    it('should throw if finished is a number', function() {
      function validate() {
        Block._validateFinished(21);
      }

      validate.should.throw(Error, 'finished must be a boolean');
    });

    it('should throw if finished is a string', function() {
      function validate() {
        Block._validateFinished('foo');
      }

      validate.should.throw(Error, 'finished must be a boolean');
    });

    it('should throw if finished is null', function() {
      function validate() {
        Block._validateFinished(null);
      }

      validate.should.throw(Error, 'finished must be a boolean');
    });

    it('should allow undefined', function() {
      Block._validateFinished(undefined);
    });

    it('should throw if finished is {}', function() {
      function validate() {
        Block._validateFinished({});
      }

      validate.should.throw(Error, 'finished must be a boolean');
    });
  });

  describe('toObject', function() { // add status
    it('should create a simple object from the walletTransaction', function() {
      var block = Block.create({
        hash: '0000000000000000059ad0d7e9dd0997533598882011cd5c047871a16b1a6ea7',
        previousHash: '000000000000000000cd925927aa1f8efa86a188dafe467eb0f535c8150fc041',
        height: 406831,
        network: 'livenet'
      });

      var object = block.toObject();

      object.should.not.equal(block);
      object.should.deep.equal({
        hash: '0000000000000000059ad0d7e9dd0997533598882011cd5c047871a16b1a6ea7',
        previousHash: '000000000000000000cd925927aa1f8efa86a188dafe467eb0f535c8150fc041',
        height: 406831,
        network: 'livenet'
      });
    });
  });
});
