'use strict';

var WalletTransaction = require('./model/walletTransaction');
var Storage = require('./storage');
var async = require('async');
var bitcore = require('bitcore-lib');


function BlockHandler(options) {
  options = options || {};
  this.storage = new Storage(options.storage);
  // this.storage.connect();
}

/*
"block" will be a bitcore block object + height attribute
*/
BlockHandler.prototype.handleAddBlock = function(block, callback) {
  var self = this;

  var addressTransactionList = this.buildAddressTransactionList(block);
  var newWalletTransactions = [];

  var addresses = Object.keys(addressTransactionList);

  this.storage.fetchAddressesForBlockHandler(addresses, function(err, addresses) {
    if (err) {
      return callback(err);
    }

    for (var i = 0; i < addresses.length; i++) {
      var addressObject = addresses[i];
      var addressString = addressObject.address;
      var walletId = addressObject.walletId;
      var transactions = addressTransactionList[addressString];
      for (var j = 0; j < transactions.length; j++) {
        var transaction = transactions[j];
        newWalletTransactions.push({
          address: addressString,
          walletId: walletId,
          txid: transaction.txid,
          receiving: transaction.receiving,
          blockHeight: block.height
        });
      }
    }

    async.eachSeries(newWalletTransactions, self.createWalletTransaction.bind(self), callback);
  });
};

BlockHandler.prototype.handleRemoveBlock = function(block, callback) {
  this.storage.removeWalletTransactionsAtBlockHeight(block.height, callback);
};

BlockHandler.prototype.createWalletTransaction = function(options, callback) {
  var walletTransaction = WalletTransaction.create(options);

  this.storage.storeWalletTransaction(walletTransaction, callback);
};

BlockHandler.prototype.buildAddressTransactionList = function(block) {
  var addressTransactionList = {};

  for (var i = 0; i < block.transactions.length; i++) {
    var transaction = block.transactions[i];
    var txid = transaction.hash;
    var outputAddresses = this.handleTransactionOutputs(transaction);
    var inputAddresses = this.handleTransactionInputs(transaction);

    for (var j = 0; j < outputAddresses.length; j++) {
      var address = outputAddresses[j];
      if (!addressTransactionList[address]) {
        addressTransactionList[address] = [];
      }
      addressTransactionList[address].push({txid: txid, receiving: true});
    }

    for (var j = 0; j < inputAddresses.length; j++) {
      var address = inputAddresses[j];
      if (!addressTransactionList[address]) {
        addressTransactionList[address] = [];
      }
      addressTransactionList[address].push({txid: txid, receiving: false});
    }
  }

  return addressTransactionList;
};

BlockHandler.prototype.handleTransactionInputs = function(transaction) {
  var addresses = {};

  for (var i = 0; i < transaction.inputs.length; i++) {
    var input = transaction.inputs[i];
    var address = this.handleInput(input);
    if (address) {
      addresses[address] = true;
    }
  }

  return Object.keys(addresses);
};

BlockHandler.prototype.handleTransactionOutputs = function(transaction) {
  var addresses = {};

  for (var j = 0; j < transaction.outputs.length; j++) {
    var output = transaction.outputs[j];
    var address = this.handleOutput(output);
    if (address) {
      addresses[address] = true;
    }
  }

  return Object.keys(addresses);
};

BlockHandler.prototype.handleInput = function(input) {
  var script = input.script;

  if (!script) { // invalid scripts and coinbase input scripts will not be instantiated as bitcore script objects
    return;
  }

  if (script.isPublicKeyHashIn() || script.isScriptHashIn()) {
    var address = bitcore.Address.fromScript(script);
    return address.toString();
  }
};

BlockHandler.prototype.handleOutput = function(output) {
  var script = output.script;

  if (!script) { // invalid scripts will not be instantiated as bitcore script objects
    return;
  }

  var address = script.toAddress();
  if (address.type === 'pubkeyhash' || address.type === 'scripthash') {
    return address.toString();
  }
};

module.exports = BlockHandler;
