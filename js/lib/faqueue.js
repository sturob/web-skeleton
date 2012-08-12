(function(){

  // Events from Backbone.js

  var slice = Array.prototype.slice;
  var splice = Array.prototype.splice;

  // Backbone.Events
  // -----------------

  // Regular expression used to split event strings
  var eventSplitter = /\s+/;

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback functions
  // to an event; trigger`-ing an event fires all callbacks in succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = {

    // Bind one or more space separated events, `events`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    on: function(events, callback, context) {

      var calls, event, node, tail, list;
      if (!callback) return this;
      events = events.split(eventSplitter);
      calls = this._callbacks || (this._callbacks = {});

      // Create an immutable callback list, allowing traversal during
      // modification.  The tail is an empty object that will always be used
      // as the next node.
      while (event = events.shift()) {
        list = calls[event];
        node = list ? list.tail : {};
        node.next = tail = {};
        node.context = context;
        node.callback = callback;
        calls[event] = {tail: tail, next: list ? list.next : node};
      }

      return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `events` is null, removes all bound callbacks for all events.
    off: function(events, callback, context) {
      var event, calls, node, tail, cb, ctx;

      // No events, or removing *all* events.
      if (!(calls = this._callbacks)) return;
      if (!(events || callback || context)) {
        delete this._callbacks;
        return this;
      }

      // Loop through the listed events and contexts, splicing them out of the
      // linked list of callbacks if appropriate.
      events = events ? events.split(eventSplitter) : _.keys(calls);
      while (event = events.shift()) {
        node = calls[event];
        delete calls[event];
        if (!node || !(callback || context)) continue;
        // Create a new list, omitting the indicated callbacks.
        tail = node.tail;
        while ((node = node.next) !== tail) {
          cb = node.callback;
          ctx = node.context;
          if ((callback && cb !== callback) || (context && ctx !== context)) {
            this.on(event, cb, ctx);
          }
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(events) {
      var event, node, calls, tail, args, all, rest;
      if (!(calls = this._callbacks)) return this;
      all = calls.all;
      events = events.split(eventSplitter);
      rest = slice.call(arguments, 1);

      // For each event, walk through the linked list of callbacks twice,
      // first to trigger the event, then to trigger any `"all"` callbacks.
      while (event = events.shift()) {
        if (node = calls[event]) {
          tail = node.tail;
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, rest);
          }
        }
        if (node = all) {
          tail = node.tail;
          args = [event].concat(rest);
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || this, args);
          }
        }
      }

      return this;
    }
  };

  if (typeof _ == 'undefined' && typeof require != 'undefined') {
    _ = require('underscore');  
  }
  


  // States
  //   _paused: processing paused
  //   _resting: resting between batches
  //   inbatch: processing a batch
  //   _waiting: queue empty, waiting for more to be added

  var fq = function(options) {
    this.init( options || {} );
  };

  fq.prototype.init = function(options) {
    this.options( options );

    _.extend(this, Events);

    this._resting = false;
    this._paused  = false;
    this._waiting = true;

    this._each = function(){};
    this._cancelCallbacks = [];

    this._counts = {
      queued: 0, each: 0, batch: 0
    };

    this.queue = [];
  }

  fq.prototype.options = function(options){
    this._options = _.defaults( options, {
      perBatch: 25,  restTime: 10 // workers: 1, timeout: null
    });
    return this;
  }

  fq.prototype.each = function(e) {
    this._each = e;
    return this;
  };
  

  fq.prototype.length = function(){
    return this.queue.length;
  };

  fq.prototype.add = function(arr) {
    var that = this;
    this.queue = this.queue.concat( arr );
    this._counts.queued += arr.length;
    this.trigger('add');
    if (this._waiting && ! this._paused && ! this._resting) {
      _.delay(function(){ that.start() }, 0);
    }
    return this;
  };

  fq.prototype.clear = function() {
    this.queue = [];
    this.trigger('clear');
    return this;
  };

  fq.prototype.reset = function() {
    this.init( this._options );
    this.trigger('reset');
    return this;
  };

  fq.prototype.pause = function(){
    this.trigger('pause');
    this._paused = true;
    return this;
  };

  fq.prototype.resume = function(){
    this.trigger('resume');
    this._paused = false;
    return this;
  };

  fq.prototype._oneBatch = function(){
    var that  = this,
        async = (that._each.length > 0),
        batchDone = function() {
          that.trigger('rest');
          that._resting = true;
          // rest and then recurse using setTimeout (so don't worry about the stack)
          that.batchTimeout = _.delay( function(){ that._oneBatch() }, that._options.restTime);
        },
        multidone = _.after( this._options.perBatch, batchDone );

    this.batchTimeout = null;
    this._resting = false;

    if (this._paused) {
      this.pauseTimeout = _.delay( function(){ that._oneBatch() }, 10);
      return;
    } else {
      this.pauseTimeout = null;
    }

    if (this.length() > 0) {
      var head = this.queue.splice(0, this._options.perBatch);

      this._counts.batch++;
      this.trigger('batch');

      _(head).each(function(value){
        var cancel;
        if (async) {
          cancel = that._each.call(value, multidone);
          // callback needed
        } else {
          cancel = that._each.call(value);
        }

        if (cancel) that._cancelCallbacks.push( cancel );



        that._counts.each++;
      });

      if (! async) batchDone();
    } else {
      if (! this._waiting) this.trigger('wait');
      this._waiting = true;
    }
  };

  fq.prototype.start = function() {
    this._waiting = false;
    this.trigger('start');
    this._oneBatch();
    return this;
  };

  fq.prototype.cancel = function(){
    var that = this;

    _.delay(function() { // make sure chained cancels don't happen before add()s
      that.trigger('cancel');
      that.clear();

      _(that._cancelCallbacks).each(function(cancel) {
        cancel();
      }); 
      that._cancelCallbacks = [];      
    }, 0);

  }

  fq.prototype.getStats = function() {
    return this._counts;
  };

  var faqueue = function(options) { 
    return new fq(options)
  };

  if (typeof window != 'undefined') { // browser
    window.faqueue = faqueue;
  } else {
    module.exports = faqueue;
  }
})();

