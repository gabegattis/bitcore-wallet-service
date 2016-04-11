'use strict';

var chai = require('chai');
var should = chai.should();
var sinon = require('sinon');

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

  describe('toObject', function() { // add status
    it('should create a simple object from the walletTransaction', function() {
      var block = Block.create({
        hash: '0000000000000000059ad0d7e9dd0997533598882011cd5c047871a16b1a6ea7',
        previousHash: '000000000000000000cd925927aa1f8efa86a188dafe467eb0f535c8150fc041',
        height: 406831,
      });

      var object = block.toObject();

      object.should.not.equal(block);
      object.should.deep.equal({
        hash: '0000000000000000059ad0d7e9dd0997533598882011cd5c047871a16b1a6ea7',
        previousHash: '000000000000000000cd925927aa1f8efa86a188dafe467eb0f535c8150fc041',
        height: 406831,
      });
    });
  });
});
