'use strict';

var _ = require('lodash');
var Uuid = require('uuid');
var chai = require('chai');
var sinon = require('sinon');
var should = chai.should();
var Bitcore = require('bitcore');
var WalletUtils = require('../lib/walletutils');

var aText = 'hola';
var aPubKey = '03bec86ad4a8a91fe7c11ec06af27246ec55094db3d86098b7d8b2f12afe47627f';
var aPrivKey = '09458c090a69a38368975fb68115df2f4b0ab7d1bc463fc60c67aa1730641d6c';
var aSignature = '3045022100d6186930e4cd9984e3168e15535e2297988555838ad10126d6c20d4ac0e74eb502201095a6319ea0a0de1f1e5fb50f7bf10b8069de10e0083e23dbbf8de9b8e02785';

var otherPubKey = '02555a2d45e309c00cc8c5090b6ec533c6880ab2d3bc970b3943def989b3373f16';

describe('WalletUtils', function() {

  describe('#hashMessage', function() {
    it('should create a hash', function() {
      var res = WalletUtils.hashMessage(aText);
      res.toString('hex').should.equal('4102b8a140ec642feaa1c645345f714bc7132d4fd2f7f6202db8db305a96172f');
    });
  });

  describe('#signMessage', function() {
    it('should sign a message', function() {
      var sig = WalletUtils.signMessage(aText, aPrivKey);
      should.exist(sig);
      sig.should.equal(aSignature);
    });
    it('should fail to sign with wrong args', function() {
      (function() {
        WalletUtils.signMessage(aText, aPubKey);
      }).should.throw('Number');
    });
  });

  describe('#verifyMessage', function() {
    it('should fail to verify a malformed signature', function() {
      var res = WalletUtils.verifyMessage(aText, 'badsignature', otherPubKey);
      should.exist(res);
      res.should.equal(false);
    });
    it('should fail to verify a null signature', function() {
      var res = WalletUtils.verifyMessage(aText, null, otherPubKey);
      should.exist(res);
      res.should.equal(false);
    });
    it('should fail to verify with wrong pubkey', function() {
      var res = WalletUtils.verifyMessage(aText, aSignature, otherPubKey);
      should.exist(res);
      res.should.equal(false);
    });
    it('should verify', function() {
      var res = WalletUtils.verifyMessage(aText, aSignature, aPubKey);
      should.exist(res);
      res.should.equal(true);
    });
  });

  describe('#signMessage #verifyMessage round trip', function() {
    it('should sign and verify', function() {
      var aLongerText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
      var sig = WalletUtils.signMessage(aLongerText, aPrivKey);
      WalletUtils.verifyMessage(aLongerText, sig, aPubKey).should.equal(true);
    });
  });

  describe('#encryptMessage #decryptMessage round trip', function() {
    it('should encrypt and decrypt', function() {
      var pwd = "ezDRS2NRchMJLf1IWtjL5A==";
      var ct = WalletUtils.encryptMessage('hello world', pwd);
      var msg = WalletUtils.decryptMessage(ct, pwd);
      msg.should.equal('hello world');
    });
  });

  describe('#toSecret #fromSecret round trip', function() {
    it('should create secret and parse secret', function() {
      var i = 0;
      while (i++ < 100) {
        var walletId = Uuid.v4();
        var walletPrivKey = new Bitcore.PrivateKey();
        var network = 'testnet';
        var secret = WalletUtils.toSecret(walletId, walletPrivKey, network);
        var result = WalletUtils.fromSecret(secret);
        result.walletId.should.equal(walletId);
        result.walletPrivKey.toString().should.equal(walletPrivKey.toString());
        result.network.should.equal(network);
      };
    });
  });

});
