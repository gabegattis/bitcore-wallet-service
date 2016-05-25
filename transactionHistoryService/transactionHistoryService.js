#!/usr/bin/env node

'use strict';

var config = require('../config');
var BlockDriver = require('../lib/blockDriver');

var blockDriver = new BlockDriver({
  storageOpts: config.storageOpts,
  network: 'testnet'
});

blockDriver.start(function(err) {
  if (err) {
    console.log(err);
    throw err;
  }

  console.log('Transaction history service started');
});
