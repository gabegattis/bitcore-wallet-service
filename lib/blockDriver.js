'use strict';

var bitcore = require('bitcore-lib');

var BlockchainExplorer = require('./blockchainexplorer');
var Storage = require('./storage');
var BlockHandler = require('./blockHandler');

var INSIGHT_POLLER_INTERVAL = 60000; // 60 seconds

/**
* This module gets blocks from insight and feeds them to the blockHandler.
*
* Re-orgs are handled by removing blocks backwards one at a time until the beginning of the fork. We then apply new
* blocks one at a time until we reach the tip of the chain.
*
* Restarts are handled by keeping state in the blocks collection in mongo.
*/
function BlockDriver(options) {
  options = options || {};
  this.explorer = new BlockchainExplorer(); // use default insight for now
  this.blockHandler = options.blockHandler || new BlockHandler();
  this.storage = new Storage(options.storage);
  this.running = false;
  this.pollingInterval = options.pollingInterval || INSIGHT_POLLER_INTERVAL;

  // we set a lock when performing a reorg or adding/removing a new block so that we
  // don't try to handle multiple blocks concurrently
  this.locked = false;


  // this.storage.connect();
}

// we need to figure out what to do if there is an error
// should we stop the service?
// ideally, if there is an error, we can just restart the service and it will handle the error and state
BlockDriver.prototype.start = function(callback) {
  var self = this;

  self.running = true;

  self.cleanupUnfinishedBlocks(function(err) {
    if (err) {
      return callback(err);
    }

    // maybe we can skip this and just go straight to polling since polling will be aware of reorgs
    self.checkForReorgs(function(err) {
      if (err) {
        return callback(err);
      }

      self.insightPoller = setInterval(self.insightPoller, INSIGHT_POLLER_INTERVAL);

      callback();
    });
  });
};

BlockDriver.prototype.stop = function(callback) {
  clearInterval(this.insightPoller);
  this.running = false;
  callback();
};

BlockDriver.prototype.cleanupUnfinishedBlocks = function(callback) {
  var self = this;

  self.storage.getLatestBlock(function(err, block) {
    if (err) {
      return callback(err);
    }

    if (!block) {
      //log
      return callback();
    }

    self.rehandleBlock(block, callback);
  });
};

BlockDriver.prototype.checkForReorgs = function(callback) {
  var self = this;
  self.checkLatestBlockStatus(function(err, results) {
    if (err) {
      return callback(err);
    }

    if (results.match) {
      return callback();
    }

    self.reorg(results.blockHeight, callback);
  });
};

BlockDriver.prototype.checkLatestBlockStatus = function(callback) { // give this method a better name
  var self = this;

  self.storage.getLatestBlock(function(err, dbBlock) {
    if (err) {
      return callback(err);
    }

    if (!dbBlock) {
      // log
      // returning true makes it look like we are in sync with insight even though we have no blocks at all
      return callback(true);
    }

    // make this only look up the block hash instead of the whole block
    self.fetchBlock(dbBlock.height, function(err, insightBlock) {
      if (err) {
        return callback(err);
      }

      var results = {
        match: dbBlock.hash === insightBlock.hash,
        blockHeight: dbBlock.height
      };

      callback(null, results);
    });
  });
};

// goes backwards, deleting one block at a time until we reach the point where the chains forked
BlockDriver.prototype.reorg = function(blockHeight, callback) {
  var self = this;

  self.removeBlock({height: blockHeight}, function(err) {
    if (err) {
      return callback(err);
    }

    self.checkLatestBlockStatus(function(err, results) {
      if (err) {
        return callback(err);
      }

      if (results.match) {
        return callback();
      }

      self.reorg(blockHeight - 1, callback);
    });
  });
};

// for blocks that were previously interrupted by an error or crash
BlockDriver.prototype.rehandleBlock = function(block, callback) {
  var self = this;

  if (block.action === 'adding') {
    if (block.finished) {
      return callback();
    }

    return self.addBlock(block, callback);
  }

  if (block.action === 'removing') {
    if (block.finished) {
      return self.storage.deleteBlock(block.height, callback);
    }

    self.removeBlock(block, callback);
  }
};

// Maybe take in the addBlock function from the constructor and then call that. That would make this more generic.
BlockDriver.prototype.addBlock = function(block, callback) {
  var self = this;

  self.storage.addBlock(block, function(err) {
    if (err) {
      return callback(err);
    }

    self.blockHandler.handleAddBlock(block.height, function(err) {
      if (err) {
        return callback(err);
      }

      self.storage.finishBlock(block.height, callback);
    });
  });
};

//Maybe take in the removeBlock function from the constructor and then call that. That would make this more generic.
BlockDriver.prototype.removeBlock = function(block, callback) {
  var self = this;

  self.storage.startRemovingBlock(block.height, function(err) { // update block {action: 'removing', finished: false}
    if (err) {
      return callback(err);
    }

    self.blockHandler.handleRemoveBlock({height: block.height}, function(err) {
      if (err) {
        return callback(err);
      }

      self.storage.finishBlock(block.height, function(err) {
        if (err) {
          return callback(err);
        }

        self.storage.deleteBlock(block.height, callback);
      });
    });
  });
};

BlockDriver.prototype.fetchBlock = function(blockHeight, callback) {
  this.explorer.getRawBlock({height: blockHeight}, function(err, rawBlockHex) {
    if (err) {
      return callback(err);
    }

    if (!rawBlockHex) { // what if this is because there is no block at this height?
      return callback(new Error('no raw block response from explorer'));
    }

    var block;
    try {
      block = bitcore.Block.fromString(rawBlockHex);
    } catch(e) {
      return callback(new Error('failed to parse raw block hex: ' + e.message));
    }

    block.height = blockHeight; // put this part in the explorer?

    callback(null, block);
  });
};

BlockDriver.prototype.insightPoller = function() {
  var self = this;

  if (self.locked) {
    return;
  }

  self.locked = true;

  self.pollInsight(function(err) {
    if (err) {
      //
      //log
    }

    self.locked = false;
  });
};

// maybe we should keep the current mongo block height in memory
BlockDriver.prototype.pollInsight = function(callback) {
  var self = this;

  self.storage.getLatestBlock(function(err, dbBlock) {
    if (err) {
      return callback(err);
    }

    self.fetchBlock(dbBlock.height + 1, function(err, insightBlock) {
      if (err) {
        return callback(err);
      }

      if (insightBlock.header.prevHash !== dbBlock.hash) {
        return self.reorg(dbBlock.height, callback);
      }

      self.addBlock(insightBlock, callback);
    });
  });
};

module.exports = BlockDriver;
