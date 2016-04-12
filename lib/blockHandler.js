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

/**
* Inserts new WalletTransaction documents into mongo for each transaction in the block associated with a BWS wallet
* "block" will be a bitcore block object + height attribute
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

// maybe this should be called "handleRemoveBlockAtHeight" since it cannot be called with a full block, only the height
BlockHandler.prototype.handleRemoveBlock = function(block, callback) {
  this.storage.removeWalletTransactionsAtBlockHeight(block.height, callback);
};

BlockHandler.prototype.createWalletTransaction = function(options, callback) {
  var walletTransaction = WalletTransaction.create(options);

  this.storage.storeWalletTransaction(walletTransaction, callback);
};

/**
* Returns an object where the keys are addresses and the values are an object containing a txid and a boolean
* specifying if the tx was sending from the wallet or receiving to that wallet. If a single transaction has
* inputs and outputs with the same address, 2 entries will be created, one with receiving: false for the input(s)
* and one with true for the output(s)
*
* example:
*  {
*    '15urYnyeJe3gwbGJ74wcX89Tz7ZtsFDVew': [
*      {
*        txid: '44a08a1c6a9dd4a2257ca72858ac009b0f2ac8070ce68b87a3642259b74fd32c',
*        receiving: true
*      }
*    ]
*  }
*/
BlockHandler.prototype.buildAddressTransactionList = function(block) {
  var addressTransactionList = {};

  for (var i = 0; i < block.transactions.length; i++) {
    var transaction = block.transactions[i];
    var txid = transaction.hash;
    var outputAddresses = this.getAddressesFromOuputs(transaction);
    var inputAddresses = this.getAddressesFromInputs(transaction);

    getTxidsForOutputs();
    getTxidsForInputs();
  }

  return addressTransactionList;

  function getTxidsForOutputs() {
    for (var i = 0; i < outputAddresses.length; i++) {
      var address = outputAddresses[i];
      if (!addressTransactionList[address]) {
        addressTransactionList[address] = [];
      }
      addressTransactionList[address].push({txid: txid, receiving: true});
    }
  }

  function getTxidsForInputs() {
    for (var i = 0; i < inputAddresses.length; i++) {
      var address = inputAddresses[i];
      if (!addressTransactionList[address]) {
        addressTransactionList[address] = [];
      }
      addressTransactionList[address].push({txid: txid, receiving: false});
    }
  }
};

BlockHandler.prototype.getAddressesFromOuputs = function(transaction) {
  var addresses = {};

  for (var j = 0; j < transaction.outputs.length; j++) {
    var output = transaction.outputs[j];
    var address = this.getAddressFromOutput(output);
    if (address) {
      addresses[address] = true;
    }
  }

  return Object.keys(addresses);
};

BlockHandler.prototype.getAddressesFromInputs = function(transaction) {
  var addresses = {};

  for (var i = 0; i < transaction.inputs.length; i++) {
    var input = transaction.inputs[i];
    var address = this.getAddressFromInput(input);
    if (address) {
      addresses[address] = true;
    }
  }

  return Object.keys(addresses);
};

BlockHandler.prototype.getAddressFromOutput = function(output) {
  var script = output.script;

  if (!script) { // invalid scripts will not be instantiated as bitcore script objects
    return;
  }

  var address = script.toAddress();
  // when we add support for new transaction types, such as SegWit transactions, we will need to update this part
  if (address.type === 'pubkeyhash' || address.type === 'scripthash') {
    return address.toString();
  }
};

BlockHandler.prototype.getAddressFromInput = function(input) {
  var script = input.script;

  if (!script) { // invalid scripts and coinbase input scripts will not be instantiated as bitcore script objects
    return;
  }

  // when we add support for new transaction types, such as SegWit transactions, we will need to update this part
  if (script.isPublicKeyHashIn() || script.isScriptHashIn()) {
    var address = bitcore.Address.fromScript(script);
    return address.toString();
  }
};

module.exports = BlockHandler;
