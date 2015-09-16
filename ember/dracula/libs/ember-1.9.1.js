/*!
 * @overview  Ember - JavaScript Application Framework
 * @copyright Copyright 2011-2014 Tilde Inc. and contributors
 *            Portions Copyright 2006-2011 Strobe Inc.
 *            Portions Copyright 2008-2011 Apple Inc. All rights reserved.
 * @license   Licensed under MIT license
 *            See https://raw.github.com/emberjs/ember.js/master/LICENSE
 * @version   1.9.1
 */

(function() {
var enifed, requireModule, eriuqer, requirejs, Ember;

(function() {
  Ember = this.Ember = this.Ember || {};
  if (typeof Ember === 'undefined') { Ember = {}; };
  function UNDEFINED() { }

  if (typeof Ember.__loader === 'undefined') {
    var registry = {}, seen = {};

    enifed = function(name, deps, callback) {
      registry[name] = { deps: deps, callback: callback };
    };

    requirejs = eriuqer = requireModule = function(name) {
      var s = seen[name];

      if (s !== undefined) { return seen[name]; }
      if (s === UNDEFINED) { return undefined;  }

      seen[name] = {};

      if (!registry[name]) {
        throw new Error("Could not find module " + name);
      }

      var mod = registry[name];
      var deps = mod.deps;
      var callback = mod.callback;
      var reified = [];
      var exports;
      var length = deps.length;

      for (var i=0; i<length; i++) {
        if (deps[i] === 'exports') {
          reified.push(exports = {});
        } else {
          reified.push(requireModule(resolve(deps[i], name)));
        }
      }

      var value = length === 0 ? callback.call(this) : callback.apply(this, reified);

      return seen[name] = exports || (value === undefined ? UNDEFINED : value);
    };

    function resolve(child, name) {
      if (child.charAt(0) !== '.') { return child; }
      var parts = child.split("/");
      var parentBase = name.split("/").slice(0, -1);

      for (var i=0, l=parts.length; i<l; i++) {
        var part = parts[i];

        if (part === '..') { parentBase.pop(); }
        else if (part === '.') { continue; }
        else { parentBase.push(part); }
      }

      return parentBase.join("/");
    }

    requirejs._eak_seen = registry;

    Ember.__loader = {define: enifed, require: eriuqer, registry: registry};
  } else {
    enifed = Ember.__loader.define;
    requirejs = eriuqer = requireModule = Ember.__loader.require;
  }
})();

enifed("backburner",
  ["backburner/utils","backburner/platform","backburner/binary-search","backburner/deferred-action-queues","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var each = __dependency1__.each;
    var isString = __dependency1__.isString;
    var isFunction = __dependency1__.isFunction;
    var isNumber = __dependency1__.isNumber;
    var isCoercableNumber = __dependency1__.isCoercableNumber;
    var wrapInTryCatch = __dependency1__.wrapInTryCatch;
    var now = __dependency1__.now;

    var needsIETryCatchFix = __dependency2__.needsIETryCatchFix;

    var searchTimer = __dependency3__["default"];

    var DeferredActionQueues = __dependency4__["default"];

    var slice = [].slice;
    var pop = [].pop;
    var global = this;

    function Backburner(queueNames, options) {
      this.queueNames = queueNames;
      this.options = options || {};
      if (!this.options.defaultQueue) {
        this.options.defaultQueue = queueNames[0];
      }
      this.instanceStack = [];
      this._debouncees = [];
      this._throttlers = [];
      this._timers = [];
    }

    Backburner.prototype = {
      begin: function() {
        var options = this.options;
        var onBegin = options && options.onBegin;
        var previousInstance = this.currentInstance;

        if (previousInstance) {
          this.instanceStack.push(previousInstance);
        }

        this.currentInstance = new DeferredActionQueues(this.queueNames, options);
        if (onBegin) {
          onBegin(this.currentInstance, previousInstance);
        }
      },

      end: function() {
        var options = this.options;
        var onEnd = options && options.onEnd;
        var currentInstance = this.currentInstance;
        var nextInstance = null;

        // Prevent double-finally bug in Safari 6.0.2 and iOS 6
        // This bug appears to be resolved in Safari 6.0.5 and iOS 7
        var finallyAlreadyCalled = false;
        try {
          currentInstance.flush();
        } finally {
          if (!finallyAlreadyCalled) {
            finallyAlreadyCalled = true;

            this.currentInstance = null;

            if (this.instanceStack.length) {
              nextInstance = this.instanceStack.pop();
              this.currentInstance = nextInstance;
            }

            if (onEnd) {
              onEnd(currentInstance, nextInstance);
            }
          }
        }
      },

      run: function(target, method /*, args */) {
        var onError = getOnError(this.options);

        this.begin();

        if (!method) {
          method = target;
          target = null;
        }

        if (isString(method)) {
          method = target[method];
        }

        var args = slice.call(arguments, 2);

        // guard against Safari 6's double-finally bug
        var didFinally = false;

        if (onError) {
          try {
            return method.apply(target, args);
          } catch(error) {
            onError(error);
          } finally {
            if (!didFinally) {
              didFinally = true;
              this.end();
            }
          }
        } else {
          try {
            return method.apply(target, args);
          } finally {
            if (!didFinally) {
              didFinally = true;
              this.end();
            }
          }
        }
      },

      join: function(target, method /*, args */) {
        if (this.currentInstance) {
          if (!method) {
            method = target;
            target = null;
          }

          if (isString(method)) {
            method = target[method];
          }

          return method.apply(target, slice.call(arguments, 2));
        } else {
          return this.run.apply(this, arguments);
        }
      },

      defer: function(queueName, target, method /* , args */) {
        if (!method) {
          method = target;
          target = null;
        }

        if (isString(method)) {
          method = target[method];
        }

        var stack = this.DEBUG ? new Error() : undefined;
        var length = arguments.length;
        var args;

        if (length > 3) {
          args = new Array(length - 3);
          for (var i = 3; i < length; i++) {
            args[i-3] = arguments[i];
          }
        } else {
          args = undefined;
        }

        if (!this.currentInstance) { createAutorun(this); }
        return this.currentInstance.schedule(queueName, target, method, args, false, stack);
      },

      deferOnce: function(queueName, target, method /* , args */) {
        if (!method) {
          method = target;
          target = null;
        }

        if (isString(method)) {
          method = target[method];
        }

        var stack = this.DEBUG ? new Error() : undefined;
        var length = arguments.length;
        var args;

        if (length > 3) {
          args = new Array(length - 3);
          for (var i = 3; i < length; i++) {
            args[i-3] = arguments[i];
          }
        } else {
          args = undefined;
        }

        if (!this.currentInstance) {
          createAutorun(this);
        }
        return this.currentInstance.schedule(queueName, target, method, args, true, stack);
      },

      setTimeout: function() {
        var l = arguments.length;
        var args = new Array(l);

        for (var x = 0; x < l; x++) {
          args[x] = arguments[x];
        }

        var length = args.length,
            method, wait, target,
            methodOrTarget, methodOrWait, methodOrArgs;

        if (length === 0) {
          return;
        } else if (length === 1) {
          method = args.shift();
          wait = 0;
        } else if (length === 2) {
          methodOrTarget = args[0];
          methodOrWait = args[1];

          if (isFunction(methodOrWait) || isFunction(methodOrTarget[methodOrWait])) {
            target = args.shift();
            method = args.shift();
            wait = 0;
          } else if (isCoercableNumber(methodOrWait)) {
            method = args.shift();
            wait = args.shift();
          } else {
            method = args.shift();
            wait =  0;
          }
        } else {
          var last = args[args.length - 1];

          if (isCoercableNumber(last)) {
            wait = args.pop();
          } else {
            wait = 0;
          }

          methodOrTarget = args[0];
          methodOrArgs = args[1];

          if (isFunction(methodOrArgs) || (isString(methodOrArgs) &&
                                          methodOrTarget !== null &&
                                          methodOrArgs in methodOrTarget)) {
            target = args.shift();
            method = args.shift();
          } else {
            method = args.shift();
          }
        }

        var executeAt = now() + parseInt(wait, 10);

        if (isString(method)) {
          method = target[method];
        }

        var onError = getOnError(this.options);

        function fn() {
          if (onError) {
            try {
              method.apply(target, args);
            } catch (e) {
              onError(e);
            }
          } else {
            method.apply(target, args);
          }
        }

        // find position to insert
        var i = searchTimer(executeAt, this._timers);

        this._timers.splice(i, 0, executeAt, fn);

        updateLaterTimer(this, executeAt, wait);

        return fn;
      },

      throttle: function(target, method /* , args, wait, [immediate] */) {
        var backburner = this;
        var args = arguments;
        var immediate = pop.call(args);
        var wait, throttler, index, timer;

        if (isNumber(immediate) || isString(immediate)) {
          wait = immediate;
          immediate = true;
        } else {
          wait = pop.call(args);
        }

        wait = parseInt(wait, 10);

        index = findThrottler(target, method, this._throttlers);
        if (index > -1) { return this._throttlers[index]; } // throttled

        timer = global.setTimeout(function() {
          if (!immediate) {
            backburner.run.apply(backburner, args);
          }
          var index = findThrottler(target, method, backburner._throttlers);
          if (index > -1) {
            backburner._throttlers.splice(index, 1);
          }
        }, wait);

        if (immediate) {
          this.run.apply(this, args);
        }

        throttler = [target, method, timer];

        this._throttlers.push(throttler);

        return throttler;
      },

      debounce: function(target, method /* , args, wait, [immediate] */) {
        var backburner = this;
        var args = arguments;
        var immediate = pop.call(args);
        var wait, index, debouncee, timer;

        if (isNumber(immediate) || isString(immediate)) {
          wait = immediate;
          immediate = false;
        } else {
          wait = pop.call(args);
        }

        wait = parseInt(wait, 10);
        // Remove debouncee
        index = findDebouncee(target, method, this._debouncees);

        if (index > -1) {
          debouncee = this._debouncees[index];
          this._debouncees.splice(index, 1);
          clearTimeout(debouncee[2]);
        }

        timer = global.setTimeout(function() {
          if (!immediate) {
            backburner.run.apply(backburner, args);
          }
          var index = findDebouncee(target, method, backburner._debouncees);
          if (index > -1) {
            backburner._debouncees.splice(index, 1);
          }
        }, wait);

        if (immediate && index === -1) {
          backburner.run.apply(backburner, args);
        }

        debouncee = [
          target,
          method,
          timer
        ];

        backburner._debouncees.push(debouncee);

        return debouncee;
      },

      cancelTimers: function() {
        var clearItems = function(item) {
          clearTimeout(item[2]);
        };

        each(this._throttlers, clearItems);
        this._throttlers = [];

        each(this._debouncees, clearItems);
        this._debouncees = [];

        if (this._laterTimer) {
          clearTimeout(this._laterTimer);
          this._laterTimer = null;
        }
        this._timers = [];

        if (this._autorun) {
          clearTimeout(this._autorun);
          this._autorun = null;
        }
      },

      hasTimers: function() {
        return !!this._timers.length || !!this._debouncees.length || !!this._throttlers.length || this._autorun;
      },

      cancel: function(timer) {
        var timerType = typeof timer;

        if (timer && timerType === 'object' && timer.queue && timer.method) { // we're cancelling a deferOnce
          return timer.queue.cancel(timer);
        } else if (timerType === 'function') { // we're cancelling a setTimeout
          for (var i = 0, l = this._timers.length; i < l; i += 2) {
            if (this._timers[i + 1] === timer) {
              this._timers.splice(i, 2); // remove the two elements
              if (i === 0) {
                if (this._laterTimer) { // Active timer? Then clear timer and reset for future timer
                  clearTimeout(this._laterTimer);
                  this._laterTimer = null;
                }
                if (this._timers.length > 0) { // Update to next available timer when available
                  updateLaterTimer(this, this._timers[0], this._timers[0] - now());
                }
              }
              return true;
            }
          }
        } else if (Object.prototype.toString.call(timer) === "[object Array]"){ // we're cancelling a throttle or debounce
          return this._cancelItem(findThrottler, this._throttlers, timer) ||
                   this._cancelItem(findDebouncee, this._debouncees, timer);
        } else {
          return; // timer was null or not a timer
        }
      },

      _cancelItem: function(findMethod, array, timer){
        var item, index;

        if (timer.length < 3) { return false; }

        index = findMethod(timer[0], timer[1], array);

        if (index > -1) {

          item = array[index];

          if (item[2] === timer[2]) {
            array.splice(index, 1);
            clearTimeout(timer[2]);
            return true;
          }
        }

        return false;
      }
    };

    Backburner.prototype.schedule = Backburner.prototype.defer;
    Backburner.prototype.scheduleOnce = Backburner.prototype.deferOnce;
    Backburner.prototype.later = Backburner.prototype.setTimeout;

    if (needsIETryCatchFix) {
      var originalRun = Backburner.prototype.run;
      Backburner.prototype.run = wrapInTryCatch(originalRun);

      var originalEnd = Backburner.prototype.end;
      Backburner.prototype.end = wrapInTryCatch(originalEnd);
    }

    function getOnError(options) {
      return options.onError || (options.onErrorTarget && options.onErrorTarget[options.onErrorMethod]);
    }

    function createAutorun(backburner) {
      backburner.begin();
      backburner._autorun = global.setTimeout(function() {
        backburner._autorun = null;
        backburner.end();
      });
    }

    function updateLaterTimer(backburner, executeAt, wait) {
      var n = now();
      if (!backburner._laterTimer || executeAt < backburner._laterTimerExpiresAt || backburner._laterTimerExpiresAt < n) {

        if (backburner._laterTimer) {
          // Clear when:
          // - Already expired
          // - New timer is earlier
          clearTimeout(backburner._laterTimer);

          if (backburner._laterTimerExpiresAt < n) { // If timer was never triggered
            // Calculate the left-over wait-time
            wait = Math.max(0, executeAt - n);
          }
        }

        backburner._laterTimer = global.setTimeout(function() {
          backburner._laterTimer = null;
          backburner._laterTimerExpiresAt = null;
          executeTimers(backburner);
        }, wait);

        backburner._laterTimerExpiresAt = n + wait;
      }
    }

    function executeTimers(backburner) {
      var n = now();
      var fns, i, l;

      backburner.run(function() {
        i = searchTimer(n, backburner._timers);

        fns = backburner._timers.splice(0, i);

        for (i = 1, l = fns.length; i < l; i += 2) {
          backburner.schedule(backburner.options.defaultQueue, null, fns[i]);
        }
      });

      if (backburner._timers.length) {
        updateLaterTimer(backburner, backburner._timers[0], backburner._timers[0] - n);
      }
    }

    function findDebouncee(target, method, debouncees) {
      return findItem(target, method, debouncees);
    }

    function findThrottler(target, method, throttlers) {
      return findItem(target, method, throttlers);
    }

    function findItem(target, method, collection) {
      var item;
      var index = -1;

      for (var i = 0, l = collection.length; i < l; i++) {
        item = collection[i];
        if (item[0] === target && item[1] === method) {
          index = i;
          break;
        }
      }

      return index;
    }

    __exports__["default"] = Backburner;
  });
enifed("backburner.umd",
  ["./backburner"],
  function(__dependency1__) {
    "use strict";
    var Backburner = __dependency1__["default"];

    /* global define:true module:true window: true */
    if (typeof enifed === 'function' && enifed.amd) {
      enifed(function() { return Backburner; });
    } else if (typeof module !== 'undefined' && module.exports) {
      module.exports = Backburner;
    } else if (typeof this !== 'undefined') {
      this['Backburner'] = Backburner;
    }
  });
enifed("backburner/binary-search",
  ["exports"],
  function(__exports__) {
    "use strict";
    __exports__["default"] = function binarySearch(time, timers) {
      var start = 0;
      var end = timers.length - 2;
      var middle, l;

      while (start < end) {
        // since timers is an array of pairs 'l' will always
        // be an integer
        l = (end - start) / 2;

        // compensate for the index in case even number
        // of pairs inside timers
        middle = start + l - (l % 2);

        if (time >= timers[middle]) {
          start = middle + 2;
        } else {
          end = middle;
        }
      }

      return (time >= timers[start]) ? start + 2 : start;
    }
  });
enifed("backburner/deferred-action-queues",
  ["./utils","./queue","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var each = __dependency1__.each;
    var Queue = __dependency2__["default"];

    function DeferredActionQueues(queueNames, options) {
      var queues = this.queues = Object.create(null);
      this.queueNames = queueNames = queueNames || [];

      this.options = options;

      each(queueNames, function(queueName) {
        queues[queueName] = new Queue(queueName, options[queueName], options);
      });
    }

    function noSuchQueue(name) {
      throw new Error("You attempted to schedule an action in a queue (" + name + ") that doesn't exist");
    }

    DeferredActionQueues.prototype = {
      schedule: function(name, target, method, args, onceFlag, stack) {
        var queues = this.queues;
        var queue = queues[name];

        if (!queue) {
          noSuchQueue(name);
        }

        if (onceFlag) {
          return queue.pushUnique(target, method, args, stack);
        } else {
          return queue.push(target, method, args, stack);
        }
      },

      flush: function() {
        var queues = this.queues;
        var queueNames = this.queueNames;
        var queueName, queue, queueItems, priorQueueNameIndex;
        var queueNameIndex = 0;
        var numberOfQueues = queueNames.length;
        var options = this.options;

        while (queueNameIndex < numberOfQueues) {
          queueName = queueNames[queueNameIndex];
          queue = queues[queueName];

          var numberOfQueueItems = queue._queue.length;

          if (numberOfQueueItems === 0) {
            queueNameIndex++;
          } else {
            queue.flush(false /* async */);
            queueNameIndex = 0;
          }
        }
      }
    };

    __exports__["default"] = DeferredActionQueues;
  });
enifed("backburner/platform",
  ["exports"],
  function(__exports__) {
    "use strict";
    // In IE 6-8, try/finally doesn't work without a catch.
    // Unfortunately, this is impossible to test for since wrapping it in a parent try/catch doesn't trigger the bug.
    // This tests for another broken try/catch behavior that only exhibits in the same versions of IE.
    var needsIETryCatchFix = (function(e,x){
      try{ x(); }
      catch(e) { } // jshint ignore:line
      return !!e;
    })();
    __exports__.needsIETryCatchFix = needsIETryCatchFix;
  });
enifed("backburner/queue",
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var isString = __dependency1__.isString;

    function Queue(name, options, globalOptions) {
      this.name = name;
      this.globalOptions = globalOptions || {};
      this.options = options;
      this._queue = [];
      this.targetQueues = Object.create(null);
      this._queueBeingFlushed = undefined;
    }

    Queue.prototype = {
      push: function(target, method, args, stack) {
        var queue = this._queue;
        queue.push(target, method, args, stack);

        return {
          queue: this,
          target: target,
          method: method
        };
      },

      pushUniqueWithoutGuid: function(target, method, args, stack) {
        var queue = this._queue;

        for (var i = 0, l = queue.length; i < l; i += 4) {
          var currentTarget = queue[i];
          var currentMethod = queue[i+1];

          if (currentTarget === target && currentMethod === method) {
            queue[i+2] = args;  // replace args
            queue[i+3] = stack; // replace stack
            return;
          }
        }

        queue.push(target, method, args, stack);
      },

      targetQueue: function(targetQueue, target, method, args, stack) {
        var queue = this._queue;

        for (var i = 0, l = targetQueue.length; i < l; i += 4) {
          var currentMethod = targetQueue[i];
          var currentIndex  = targetQueue[i + 1];

          if (currentMethod === method) {
            queue[currentIndex + 2] = args;  // replace args
            queue[currentIndex + 3] = stack; // replace stack
            return;
          }
        }

        targetQueue.push(
          method,
          queue.push(target, method, args, stack) - 4
        );
      },

      pushUniqueWithGuid: function(guid, target, method, args, stack) {
        var hasLocalQueue = this.targetQueues[guid];

        if (hasLocalQueue) {
          this.targetQueue(hasLocalQueue, target, method, args, stack);
        } else {
          this.targetQueues[guid] = [
            method,
            this._queue.push(target, method, args, stack) - 4
          ];
        }

        return {
          queue: this,
          target: target,
          method: method
        };
      },

      pushUnique: function(target, method, args, stack) {
        var queue = this._queue, currentTarget, currentMethod, i, l;
        var KEY = this.globalOptions.GUID_KEY;

        if (target && KEY) {
          var guid = target[KEY];
          if (guid) {
            return this.pushUniqueWithGuid(guid, target, method, args, stack);
          }
        }

        this.pushUniqueWithoutGuid(target, method, args, stack);

        return {
          queue: this,
          target: target,
          method: method
        };
      },

      invoke: function(target, method, args, _, _errorRecordedForStack) {
        if (args && args.length > 0) {
          method.apply(target, args);
        } else {
          method.call(target);
        }
      },

      invokeWithOnError: function(target, method, args, onError, errorRecordedForStack) {
        try {
          if (args && args.length > 0) {
            method.apply(target, args);
          } else {
            method.call(target);
          }
        } catch(error) {
          onError(error, errorRecordedForStack);
        }
      },

      flush: function(sync) {
        var queue = this._queue;
        var length = queue.length;

        if (length === 0) {
          return;
        }

        var globalOptions = this.globalOptions;
        var options = this.options;
        var before = options && options.before;
        var after = options && options.after;
        var onError = globalOptions.onError || (globalOptions.onErrorTarget &&
                                                globalOptions.onErrorTarget[globalOptions.onErrorMethod]);
        var target, method, args, errorRecordedForStack;
        var invoke = onError ? this.invokeWithOnError : this.invoke;

        this.targetQueues = Object.create(null);
        var queueItems = this._queueBeingFlushed = this._queue.slice();
        this._queue = [];

        if (before) {
          before();
        }

        for (var i = 0; i < length; i += 4) {
          target                = queueItems[i];
          method                = queueItems[i+1];
          args                  = queueItems[i+2];
          errorRecordedForStack = queueItems[i+3]; // Debugging assistance

          if (isString(method)) {
            method = target[method];
          }

          // method could have been nullified / canceled during flush
          if (method) {
            //
            //    ** Attention intrepid developer **
            //
            //    To find out the stack of this task when it was scheduled onto
            //    the run loop, add the following to your app.js:
            //
            //    Ember.run.backburner.DEBUG = true; // NOTE: This slows your app, don't leave it on in production.
            //
            //    Once that is in place, when you are at a breakpoint and navigate
            //    here in the stack explorer, you can look at `errorRecordedForStack.stack`,
            //    which will be the captured stack when this job was scheduled.
            //
            invoke(target, method, args, onError, errorRecordedForStack);
          }
        }

        if (after) {
          after();
        }

        this._queueBeingFlushed = undefined;

        if (sync !== false &&
            this._queue.length > 0) {
          // check if new items have been added
          this.flush(true);
        }
      },

      cancel: function(actionToCancel) {
        var queue = this._queue, currentTarget, currentMethod, i, l;
        var target = actionToCancel.target;
        var method = actionToCancel.method;
        var GUID_KEY = this.globalOptions.GUID_KEY;

        if (GUID_KEY && this.targetQueues && target) {
          var targetQueue = this.targetQueues[target[GUID_KEY]];

          if (targetQueue) {
            for (i = 0, l = targetQueue.length; i < l; i++) {
              if (targetQueue[i] === method) {
                targetQueue.splice(i, 1);
              }
            }
          }
        }

        for (i = 0, l = queue.length; i < l; i += 4) {
          currentTarget = queue[i];
          currentMethod = queue[i+1];

          if (currentTarget === target &&
              currentMethod === method) {
            queue.splice(i, 4);
            return true;
          }
        }

        // if not found in current queue
        // could be in the queue that is being flushed
        queue = this._queueBeingFlushed;

        if (!queue) {
          return;
        }

        for (i = 0, l = queue.length; i < l; i += 4) {
          currentTarget = queue[i];
          currentMethod = queue[i+1];

          if (currentTarget === target &&
              currentMethod === method) {
            // don't mess with array during flush
            // just nullify the method
            queue[i+1] = null;
            return true;
          }
        }
      }
    };

    __exports__["default"] = Queue;
  });
enifed("backburner/utils",
  ["exports"],
  function(__exports__) {
    "use strict";
    var NUMBER = /\d+/;

    function each(collection, callback) {
      for (var i = 0; i < collection.length; i++) {
        callback(collection[i]);
      }
    }

    __exports__.each = each;// Date.now is not available in browsers < IE9
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
    var now = Date.now || function() { return new Date().getTime(); };
    __exports__.now = now;
    function isString(suspect) {
      return typeof suspect === 'string';
    }

    __exports__.isString = isString;function isFunction(suspect) {
      return typeof suspect === 'function';
    }

    __exports__.isFunction = isFunction;function isNumber(suspect) {
      return typeof suspect === 'number';
    }

    __exports__.isNumber = isNumber;function isCoercableNumber(number) {
      return isNumber(number) || NUMBER.test(number);
    }

    __exports__.isCoercableNumber = isCoercableNumber;function wrapInTryCatch(func) {
      return function () {
        try {
          return func.apply(this, arguments);
        } catch (e) {
          throw e;
        }
      };
    }

    __exports__.wrapInTryCatch = wrapInTryCatch;
  });
enifed("calculateVersion",
  [],
  function() {
    "use strict";
    'use strict';

    var fs   = eriuqer('fs');
    var path = eriuqer('path');

    module.exports = function () {
      var packageVersion = eriuqer('../package.json').version;
      var output         = [packageVersion];
      var gitPath        = path.join(__dirname,'..','.git');
      var headFilePath   = path.join(gitPath, 'HEAD');

      if (packageVersion.indexOf('+') > -1) {
        try {
          if (fs.existsSync(headFilePath)) {
            var headFile = fs.readFileSync(headFilePath, {encoding: 'utf8'});
            var branchName = headFile.split('/').slice(-1)[0].trim();
            var refPath = headFile.split(' ')[1];
            var branchSHA;

            if (refPath) {
              var branchPath = path.join(gitPath, refPath.trim());
              branchSHA  = fs.readFileSync(branchPath);
            } else {
              branchSHA = branchName;
            }

            output.push(branchSHA.slice(0,10));
          }
        } catch (err) {
          console.error(err.stack);
        }
        return output.join('.');
      } else {
        return packageVersion;
      }
    };
  });
enifed("container",
  ["container/container","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /*
    Public api for the container is still in flux.
    The public api, specified on the application namespace should be considered the stable api.
    // @module container
      @private
    */

    /*
     Flag to enable/disable model factory injections (disabled by default)
     If model factory injections are enabled, models should not be
     accessed globally (only through `container.lookupFactory('model:modelName'))`);
    */
    Ember.MODEL_FACTORY_INJECTIONS = false;

    if (Ember.ENV && typeof Ember.ENV.MODEL_FACTORY_INJECTIONS !== 'undefined') {
      Ember.MODEL_FACTORY_INJECTIONS = !!Ember.ENV.MODEL_FACTORY_INJECTIONS;
    }


    var Container = __dependency1__["default"];

    __exports__["default"] = Container;
  });
enifed("container/container",
  ["ember-metal/core","ember-metal/keys","ember-metal/dictionary","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    // Ember.assert
    var emberKeys = __dependency2__["default"];
    var dictionary = __dependency3__["default"];

    // A lightweight container that helps to assemble and decouple components.
    // Public api for the container is still in flux.
    // The public api, specified on the application namespace should be considered the stable api.
    function Container(parent) {
      this.parent = parent;
      this.children = [];

      this.resolver = parent && parent.resolver || function() {};

      this.registry       = dictionary(parent ? parent.registry : null);
      this.cache          = dictionary(parent ? parent.cache : null);
      this.factoryCache   = dictionary(parent ? parent.factoryCache : null);
      this.resolveCache   = dictionary(parent ? parent.resolveCache : null);
      this.typeInjections = dictionary(parent ? parent.typeInjections : null);
      this.injections     = dictionary(null);
      this.normalizeCache = dictionary(null);

      this.factoryTypeInjections = dictionary(parent ? parent.factoryTypeInjections : null);
      this.factoryInjections     = dictionary(null);

      this._options     = dictionary(parent ? parent._options : null);
      this._typeOptions = dictionary(parent ? parent._typeOptions : null);
    }

    Container.prototype = {

      /**
        @property parent
        @type Container
        @default null
      */
      parent: null,

      /**
        @property children
        @type Array
        @default []
      */
      children: null,

      /**
        @property resolver
        @type function
      */
      resolver: null,

      /**
        @property registry
        @type InheritingDict
      */
      registry: null,

      /**
        @property cache
        @type InheritingDict
      */
      cache: null,

      /**
        @property typeInjections
        @type InheritingDict
      */
      typeInjections: null,

      /**
        @property injections
        @type Object
        @default {}
      */
      injections: null,

      /**
        @private

        @property _options
        @type InheritingDict
        @default null
      */
      _options: null,

      /**
        @private

        @property _typeOptions
        @type InheritingDict
      */
      _typeOptions: null,

      /**
        Returns a new child of the current container. These children are configured
        to correctly inherit from the current container.

        @method child
        @return {Container}
      */
      child: function() {
        var container = new Container(this);
        this.children.push(container);
        return container;
      },

      /**
        Registers a factory for later injection.

        Example:

        ```javascript
        var container = new Container();

        container.register('model:user', Person, {singleton: false });
        container.register('fruit:favorite', Orange);
        container.register('communication:main', Email, {singleton: false});
        ```

        @method register
        @param {String} fullName
        @param {Function} factory
        @param {Object} options
      */
      register: function(fullName, factory, options) {
        Ember.assert('fullName must be a proper full name', validateFullName(fullName));

        if (factory === undefined) {
          throw new TypeError('Attempting to register an unknown factory: `' + fullName + '`');
        }

        var normalizedName = this.normalize(fullName);

        if (normalizedName in this.cache) {
          throw new Error('Cannot re-register: `' + fullName +'`, as it has already been looked up.');
        }

        this.registry[normalizedName] = factory;
        this._options[normalizedName] = (options || {});
      },

      /**
        Unregister a fullName

        ```javascript
        var container = new Container();
        container.register('model:user', User);

        container.lookup('model:user') instanceof User //=> true

        container.unregister('model:user')
        container.lookup('model:user') === undefined //=> true
        ```

        @method unregister
        @param {String} fullName
       */
      unregister: function(fullName) {
        Ember.assert('fullName must be a proper full name', validateFullName(fullName));

        var normalizedName = this.normalize(fullName);

        delete this.registry[normalizedName];
        delete this.cache[normalizedName];
        delete this.factoryCache[normalizedName];
        delete this.resolveCache[normalizedName];
        delete this._options[normalizedName];
      },

      /**
        Given a fullName return the corresponding factory.

        By default `resolve` will retrieve the factory from
        its container's registry.

        ```javascript
        var container = new Container();
        container.register('api:twitter', Twitter);

        container.resolve('api:twitter') // => Twitter
        ```

        Optionally the container can be provided with a custom resolver.
        If provided, `resolve` will first provide the custom resolver
        the opportunity to resolve the fullName, otherwise it will fallback
        to the registry.

        ```javascript
        var container = new Container();
        container.resolver = function(fullName) {
          // lookup via the module system of choice
        };

        // the twitter factory is added to the module system
        container.resolve('api:twitter') // => Twitter
        ```

        @method resolve
        @param {String} fullName
        @return {Function} fullName's factory
      */
      resolve: function(fullName) {
        Ember.assert('fullName must be a proper full name', validateFullName(fullName));
        return resolve(this, this.normalize(fullName));
      },

      /**
        A hook that can be used to describe how the resolver will
        attempt to find the factory.

        For example, the default Ember `.describe` returns the full
        class name (including namespace) where Ember's resolver expects
        to find the `fullName`.

        @method describe
        @param {String} fullName
        @return {string} described fullName
      */
      describe: function(fullName) {
        return fullName;
      },

      /**
        A hook to enable custom fullName normalization behaviour

        @method normalizeFullName
        @param {String} fullName
        @return {string} normalized fullName
      */
      normalizeFullName: function(fullName) {
        return fullName;
      },

      /**
        normalize a fullName based on the applications conventions

        @method normalize
        @param {String} fullName
        @return {string} normalized fullName
      */
      normalize: function(fullName) {
        return this.normalizeCache[fullName] || (
          this.normalizeCache[fullName] = this.normalizeFullName(fullName)
        );
      },

      /**
        @method makeToString

        @param {any} factory
        @param {string} fullName
        @return {function} toString function
      */
      makeToString: function(factory, fullName) {
        return factory.toString();
      },

      /**
        Given a fullName return a corresponding instance.

        The default behaviour is for lookup to return a singleton instance.
        The singleton is scoped to the container, allowing multiple containers
        to all have their own locally scoped singletons.

        ```javascript
        var container = new Container();
        container.register('api:twitter', Twitter);

        var twitter = container.lookup('api:twitter');

        twitter instanceof Twitter; // => true

        // by default the container will return singletons
        var twitter2 = container.lookup('api:twitter');
        twitter2 instanceof Twitter; // => true

        twitter === twitter2; //=> true
        ```

        If singletons are not wanted an optional flag can be provided at lookup.

        ```javascript
        var container = new Container();
        container.register('api:twitter', Twitter);

        var twitter = container.lookup('api:twitter', { singleton: false });
        var twitter2 = container.lookup('api:twitter', { singleton: false });

        twitter === twitter2; //=> false
        ```

        @method lookup
        @param {String} fullName
        @param {Object} options
        @return {any}
      */
      lookup: function(fullName, options) {
        Ember.assert('fullName must be a proper full name', validateFullName(fullName));
        return lookup(this, this.normalize(fullName), options);
      },

      /**
        Given a fullName return the corresponding factory.

        @method lookupFactory
        @param {String} fullName
        @return {any}
      */
      lookupFactory: function(fullName) {
        Ember.assert('fullName must be a proper full name', validateFullName(fullName));
        return factoryFor(this, this.normalize(fullName));
      },

      /**
        Given a fullName check if the container is aware of its factory
        or singleton instance.

        @method has
        @param {String} fullName
        @return {Boolean}
      */
      has: function(fullName) {
        Ember.assert('fullName must be a proper full name', validateFullName(fullName));
        return has(this, this.normalize(fullName));
      },

      /**
        Allow registering options for all factories of a type.

        ```javascript
        var container = new Container();

        // if all of type `connection` must not be singletons
        container.optionsForType('connection', { singleton: false });

        container.register('connection:twitter', TwitterConnection);
        container.register('connection:facebook', FacebookConnection);

        var twitter = container.lookup('connection:twitter');
        var twitter2 = container.lookup('connection:twitter');

        twitter === twitter2; // => false

        var facebook = container.lookup('connection:facebook');
        var facebook2 = container.lookup('connection:facebook');

        facebook === facebook2; // => false
        ```

        @method optionsForType
        @param {String} type
        @param {Object} options
      */
      optionsForType: function(type, options) {
        if (this.parent) { illegalChildOperation('optionsForType'); }

        this._typeOptions[type] = options;
      },

      /**
        @method options
        @param {String} fullName
        @param {Object} options
      */
      options: function(fullName, options) {
        options = options || {};
        var normalizedName = this.normalize(fullName);
        this._options[normalizedName] = options;
      },

      /**
        Used only via `injection`.

        Provides a specialized form of injection, specifically enabling
        all objects of one type to be injected with a reference to another
        object.

        For example, provided each object of type `controller` needed a `router`.
        one would do the following:

        ```javascript
        var container = new Container();

        container.register('router:main', Router);
        container.register('controller:user', UserController);
        container.register('controller:post', PostController);

        container.typeInjection('controller', 'router', 'router:main');

        var user = container.lookup('controller:user');
        var post = container.lookup('controller:post');

        user.router instanceof Router; //=> true
        post.router instanceof Router; //=> true

        // both controllers share the same router
        user.router === post.router; //=> true
        ```

        @private
        @method typeInjection
        @param {String} type
        @param {String} property
        @param {String} fullName
      */
      typeInjection: function(type, property, fullName) {
        Ember.assert('fullName must be a proper full name', validateFullName(fullName));

        if (this.parent) { illegalChildOperation('typeInjection'); }

        var fullNameType = fullName.split(':')[0];
        if (fullNameType === type) {
          throw new Error('Cannot inject a `' + fullName +
                          '` on other ' + type +
                          '(s). Register the `' + fullName +
                          '` as a different type and perform the typeInjection.');
        }

        addTypeInjection(this.typeInjections, type, property, fullName);
      },

      /**
        Defines injection rules.

        These rules are used to inject dependencies onto objects when they
        are instantiated.

        Two forms of injections are possible:

        * Injecting one fullName on another fullName
        * Injecting one fullName on a type

        Example:

        ```javascript
        var container = new Container();

        container.register('source:main', Source);
        container.register('model:user', User);
        container.register('model:post', Post);

        // injecting one fullName on another fullName
        // eg. each user model gets a post model
        container.injection('model:user', 'post', 'model:post');

        // injecting one fullName on another type
        container.injection('model', 'source', 'source:main');

        var user = container.lookup('model:user');
        var post = container.lookup('model:post');

        user.source instanceof Source; //=> true
        post.source instanceof Source; //=> true

        user.post instanceof Post; //=> true

        // and both models share the same source
        user.source === post.source; //=> true
        ```

        @method injection
        @param {String} factoryName
        @param {String} property
        @param {String} injectionName
      */
      injection: function(fullName, property, injectionName) {
        if (this.parent) { illegalChildOperation('injection'); }

        validateFullName(injectionName);
        var normalizedInjectionName = this.normalize(injectionName);

        if (fullName.indexOf(':') === -1) {
          return this.typeInjection(fullName, property, normalizedInjectionName);
        }

        Ember.assert('fullName must be a proper full name', validateFullName(fullName));
        var normalizedName = this.normalize(fullName);

        if (this.cache[normalizedName]) {
          throw new Error("Attempted to register an injection for a type that has already been looked up. ('" +
                          normalizedName + "', '" +
                          property + "', '" +
                          injectionName + "')");
        }

        addInjection(initRules(this.injections, normalizedName), property, normalizedInjectionName);
      },


      /**
        Used only via `factoryInjection`.

        Provides a specialized form of injection, specifically enabling
        all factory of one type to be injected with a reference to another
        object.

        For example, provided each factory of type `model` needed a `store`.
        one would do the following:

        ```javascript
        var container = new Container();

        container.register('store:main', SomeStore);

        container.factoryTypeInjection('model', 'store', 'store:main');

        var store = container.lookup('store:main');
        var UserFactory = container.lookupFactory('model:user');

        UserFactory.store instanceof SomeStore; //=> true
        ```

        @private
        @method factoryTypeInjection
        @param {String} type
        @param {String} property
        @param {String} fullName
      */
      factoryTypeInjection: function(type, property, fullName) {
        if (this.parent) { illegalChildOperation('factoryTypeInjection'); }

        addTypeInjection(this.factoryTypeInjections, type, property, this.normalize(fullName));
      },

      /**
        Defines factory injection rules.

        Similar to regular injection rules, but are run against factories, via
        `Container#lookupFactory`.

        These rules are used to inject objects onto factories when they
        are looked up.

        Two forms of injections are possible:

      * Injecting one fullName on another fullName
      * Injecting one fullName on a type

        Example:

        ```javascript
        var container = new Container();

        container.register('store:main', Store);
        container.register('store:secondary', OtherStore);
        container.register('model:user', User);
        container.register('model:post', Post);

        // injecting one fullName on another type
        container.factoryInjection('model', 'store', 'store:main');

        // injecting one fullName on another fullName
        container.factoryInjection('model:post', 'secondaryStore', 'store:secondary');

        var UserFactory = container.lookupFactory('model:user');
        var PostFactory = container.lookupFactory('model:post');
        var store = container.lookup('store:main');

        UserFactory.store instanceof Store; //=> true
        UserFactory.secondaryStore instanceof OtherStore; //=> false

        PostFactory.store instanceof Store; //=> true
        PostFactory.secondaryStore instanceof OtherStore; //=> true

        // and both models share the same source instance
        UserFactory.store === PostFactory.store; //=> true
        ```

        @method factoryInjection
        @param {String} factoryName
        @param {String} property
        @param {String} injectionName
      */
      factoryInjection: function(fullName, property, injectionName) {
        if (this.parent) { illegalChildOperation('injection'); }

        var normalizedName = this.normalize(fullName);
        var normalizedInjectionName = this.normalize(injectionName);

        validateFullName(injectionName);

        if (fullName.indexOf(':') === -1) {
          return this.factoryTypeInjection(normalizedName, property, normalizedInjectionName);
        }

        Ember.assert('fullName must be a proper full name', validateFullName(fullName));

        if (this.factoryCache[normalizedName]) {
          throw new Error('Attempted to register a factoryInjection for a type that has already ' +
            'been looked up. (\'' + normalizedName + '\', \'' + property + '\', \'' + injectionName + '\')');
        }

        addInjection(initRules(this.factoryInjections, normalizedName), property, normalizedInjectionName);
      },

      /**
        A depth first traversal, destroying the container, its descendant containers and all
        their managed objects.

        @method destroy
      */
      destroy: function() {
        for (var i = 0, length = this.children.length; i < length; i++) {
          this.children[i].destroy();
        }

        this.children = [];

        eachDestroyable(this, function(item) {
          item.destroy();
        });

        this.parent = undefined;
        this.isDestroyed = true;
      },

      /**
        @method reset
      */
      reset: function() {
        for (var i = 0, length = this.children.length; i < length; i++) {
          resetCache(this.children[i]);
        }

        resetCache(this);
      }
    };

    function resolve(container, normalizedName) {
      var cached = container.resolveCache[normalizedName];
      if (cached) { return cached; }

      var resolved = container.resolver(normalizedName) || container.registry[normalizedName];
      container.resolveCache[normalizedName] = resolved;

      return resolved;
    }

    function has(container, fullName){
      if (container.cache[fullName]) {
        return true;
      }

      return container.resolve(fullName) !== undefined;
    }

    function lookup(container, fullName, options) {
      options = options || {};

      if (container.cache[fullName] && options.singleton !== false) {
        return container.cache[fullName];
      }

      var value = instantiate(container, fullName);

      if (value === undefined) { return; }

      if (isSingleton(container, fullName) && options.singleton !== false) {
        container.cache[fullName] = value;
      }

      return value;
    }

    function illegalChildOperation(operation) {
      throw new Error(operation + ' is not currently supported on child containers');
    }

    function isSingleton(container, fullName) {
      var singleton = option(container, fullName, 'singleton');

      return singleton !== false;
    }

    function buildInjections(container, injections) {
      var hash = {};

      if (!injections) { return hash; }

      validateInjections(container, injections);

      var injection;

      for (var i = 0, length = injections.length; i < length; i++) {
        injection = injections[i];
        hash[injection.property] = lookup(container, injection.fullName);
      }

      return hash;
    }

    function validateInjections(container, injections) {
      if (!injections) { return; }

      var fullName;

      for (var i = 0, length = injections.length; i < length; i++) {
        fullName = injections[i].fullName;

        if (!container.has(fullName)) {
          throw new Error('Attempting to inject an unknown injection: `' + fullName + '`');
        }
      }
    }

    function option(container, fullName, optionName) {
      var options = container._options[fullName];

      if (options && options[optionName] !== undefined) {
        return options[optionName];
      }

      var type = fullName.split(':')[0];
      options = container._typeOptions[type];

      if (options) {
        return options[optionName];
      }
    }

    function factoryFor(container, fullName) {
      var cache = container.factoryCache;
      if (cache[fullName]) {
        return cache[fullName];
      }
      var factory = container.resolve(fullName);
      if (factory === undefined) { return; }

      var type = fullName.split(':')[0];
      if (!factory || typeof factory.extend !== 'function' || (!Ember.MODEL_FACTORY_INJECTIONS && type === 'model')) {
        // TODO: think about a 'safe' merge style extension
        // for now just fallback to create time injection
        cache[fullName] = factory;
        return factory;
      } else {
        var injections = injectionsFor(container, fullName);
        var factoryInjections = factoryInjectionsFor(container, fullName);

        factoryInjections._toString = container.makeToString(factory, fullName);

        var injectedFactory = factory.extend(injections);
        injectedFactory.reopenClass(factoryInjections);

        cache[fullName] = injectedFactory;

        return injectedFactory;
      }
    }

    function injectionsFor(container, fullName) {
      var splitName = fullName.split(':');
      var type = splitName[0];
      var injections = [];

      injections = injections.concat(container.typeInjections[type] || []);
      injections = injections.concat(container.injections[fullName] || []);

      injections = buildInjections(container, injections);
      injections._debugContainerKey = fullName;
      injections.container = container;

      return injections;
    }

    function factoryInjectionsFor(container, fullName) {
      var splitName = fullName.split(':');
      var type = splitName[0];
      var factoryInjections = [];

      factoryInjections = factoryInjections.concat(container.factoryTypeInjections[type] || []);
      factoryInjections = factoryInjections.concat(container.factoryInjections[fullName] || []);

      factoryInjections = buildInjections(container, factoryInjections);
      factoryInjections._debugContainerKey = fullName;

      return factoryInjections;
    }

    function normalizeInjectionsHash(hash) {
      var injections = [];

      for (var key in hash) {
        if (hash.hasOwnProperty(key)) {
          Ember.assert("Expected a proper full name, given '" + hash[key] + "'", validateFullName(hash[key]));

          addInjection(injections, key, hash[key]);
        }
      }

      return injections;
    }

    function instantiate(container, fullName) {
      var factory = factoryFor(container, fullName);
      var lazyInjections;

      if (option(container, fullName, 'instantiate') === false) {
        return factory;
      }

      if (factory) {
        if (typeof factory.create !== 'function') {
          throw new Error('Failed to create an instance of \'' + fullName + '\'. ' +
            'Most likely an improperly defined class or an invalid module export.');
        }


        if (typeof factory.extend === 'function') {
          // assume the factory was extendable and is already injected
          return factory.create();
        } else {
          // assume the factory was extendable
          // to create time injections
          // TODO: support new'ing for instantiation and merge injections for pure JS Functions
          return factory.create(injectionsFor(container, fullName));
        }
      }
    }

    function eachDestroyable(container, callback) {
      var cache = container.cache;
      var keys = emberKeys(cache);
      var key, value;

      for (var i = 0, l = keys.length; i < l; i++) {
        key = keys[i];
        value = cache[key];

        if (option(container, key, 'instantiate') !== false) {
          callback(value);
        }
      }
    }

    function resetCache(container) {
      eachDestroyable(container, function(value) {
        value.destroy();
      });

      container.cache.dict = dictionary(null);
    }

    function addTypeInjection(rules, type, property, fullName) {
      var injections = rules[type];

      if (!injections) {
        injections = [];
        rules[type] = injections;
      }

      injections.push({
        property: property,
        fullName: fullName
      });
    }

    var VALID_FULL_NAME_REGEXP = /^[^:]+.+:[^:]+$/;
    function validateFullName(fullName) {
      if (!VALID_FULL_NAME_REGEXP.test(fullName)) {
        throw new TypeError('Invalid Fullname, expected: `type:name` got: ' + fullName);
      }
      return true;
    }

    function initRules(rules, factoryName) {
      return rules[factoryName] || (rules[factoryName] = []);
    }

    function addInjection(injections, property, injectionName) {
      injections.push({
        property: property,
        fullName: injectionName
      });
    }

    __exports__["default"] = Container;
  });
enifed("dag-map",
  ["exports"],
  function(__exports__) {
    "use strict";
    function visit(vertex, fn, visited, path) {
      var name = vertex.name;
      var vertices = vertex.incoming;
      var names = vertex.incomingNames;
      var len = names.length;
      var i;

      if (!visited) {
        visited = {};
      }
      if (!path) {
        path = [];
      }
      if (visited.hasOwnProperty(name)) {
        return;
      }
      path.push(name);
      visited[name] = true;
      for (i = 0; i < len; i++) {
        visit(vertices[names[i]], fn, visited, path);
      }
      fn(vertex, path);
      path.pop();
    }


    /**
     * DAG stands for Directed acyclic graph.
     *
     * It is used to build a graph of dependencies checking that there isn't circular
     * dependencies. p.e Registering initializers with a certain precedence order.
     *
     * @class DAG
     * @constructor
     */
    function DAG() {
      this.names = [];
      this.vertices = Object.create(null);
    }

    /**
     * DAG Vertex
     *
     * @class Vertex
     * @constructor
     */

    function Vertex(name) {
      this.name = name;
      this.incoming = {};
      this.incomingNames = [];
      this.hasOutgoing = false;
      this.value = null;
    }

    /**
     * Adds a vertex entry to the graph unless it is already added.
     *
     * @private
     * @method add
     * @param {String} name The name of the vertex to add
     */
    DAG.prototype.add = function(name) {
      if (!name) {
        throw new Error("Can't add Vertex without name");
      }
      if (this.vertices[name] !== undefined) {
        return this.vertices[name];
      }
      var vertex = new Vertex(name);
      this.vertices[name] = vertex;
      this.names.push(name);
      return vertex;
    };

    /**
     * Adds a vertex to the graph and sets its value.
     *
     * @private
     * @method map
     * @param {String} name The name of the vertex.
     * @param         value The value to put in the vertex.
     */
    DAG.prototype.map = function(name, value) {
      this.add(name).value = value;
    };

    /**
     * Connects the vertices with the given names, adding them to the graph if
     * necessary, only if this does not produce is any circular dependency.
     *
     * @private
     * @method addEdge
     * @param {String} fromName The name the vertex where the edge starts.
     * @param {String} toName The name the vertex where the edge ends.
     */
    DAG.prototype.addEdge = function(fromName, toName) {
      if (!fromName || !toName || fromName === toName) {
        return;
      }
      var from = this.add(fromName);
      var to = this.add(toName);
      if (to.incoming.hasOwnProperty(fromName)) {
        return;
      }
      function checkCycle(vertex, path) {
        if (vertex.name === toName) {
          throw new Error("cycle detected: " + toName + " <- " + path.join(" <- "));
        }
      }
      visit(from, checkCycle);
      from.hasOutgoing = true;
      to.incoming[fromName] = from;
      to.incomingNames.push(fromName);
    };

    /**
     * Visits all the vertex of the graph calling the given function with each one,
     * ensuring that the vertices are visited respecting their precedence.
     *
     * @method  topsort
     * @param {Function} fn The function to be invoked on each vertex.
     */
    DAG.prototype.topsort = function(fn) {
      var visited = {};
      var vertices = this.vertices;
      var names = this.names;
      var len = names.length;
      var i, vertex;

      for (i = 0; i < len; i++) {
        vertex = vertices[names[i]];
        if (!vertex.hasOutgoing) {
          visit(vertex, fn, visited);
        }
      }
    };

    /**
     * Adds a vertex with the given name and value to the graph and joins it with the
     * vertices referenced in _before_ and _after_. If there isn't vertices with those
     * names, they are added too.
     *
     * If either _before_ or _after_ are falsy/empty, the added vertex will not have
     * an incoming/outgoing edge.
     *
     * @method addEdges
     * @param {String} name The name of the vertex to be added.
     * @param         value The value of that vertex.
     * @param        before An string or array of strings with the names of the vertices before
     *                      which this vertex must be visited.
     * @param         after An string or array of strings with the names of the vertex after
     *                      which this vertex must be visited.
     *
     */
    DAG.prototype.addEdges = function(name, value, before, after) {
      var i;
      this.map(name, value);
      if (before) {
        if (typeof before === 'string') {
          this.addEdge(name, before);
        } else {
          for (i = 0; i < before.length; i++) {
            this.addEdge(name, before[i]);
          }
        }
      }
      if (after) {
        if (typeof after === 'string') {
          this.addEdge(after, name);
        } else {
          for (i = 0; i < after.length; i++) {
            this.addEdge(after[i], name);
          }
        }
      }
    };

    __exports__["default"] = DAG;
  });
enifed("dag-map.umd",
  ["./dag-map"],
  function(__dependency1__) {
    "use strict";
    var DAG = __dependency1__["default"];

    /* global define:true module:true window: true */
    if (typeof enifed === 'function' && enifed.amd) {
      enifed(function() { return DAG; });
    } else if (typeof module !== 'undefined' && module.exports) {
      module.exports = DAG;
    } else if (typeof this !== 'undefined') {
      this['DAG'] = DAG;
    }
  });
enifed("ember-application",
  ["ember-metal/core","ember-runtime/system/lazy_load","ember-application/system/resolver","ember-application/system/application","ember-application/ext/controller"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var runLoadHooks = __dependency2__.runLoadHooks;

    /**
    Ember Application

    @module ember
    @submodule ember-application
    @requires ember-views, ember-routing
    */

    var Resolver = __dependency3__.Resolver;
    var DefaultResolver = __dependency3__["default"];
    var Application = __dependency4__["default"];
    // side effect of extending ControllerMixin

    Ember.Application = Application;
    Ember.Resolver = Resolver;
    Ember.DefaultResolver = DefaultResolver;

    runLoadHooks('Ember.Application', Application);
  });
enifed("ember-application/ext/controller",
  ["ember-metal/core","ember-metal/property_get","ember-metal/error","ember-metal/utils","ember-metal/computed","ember-runtime/mixins/controller","ember-routing/system/controller_for","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    /**
    @module ember
    @submodule ember-application
    */

    var Ember = __dependency1__["default"];
    // Ember.assert
    var get = __dependency2__.get;
    var EmberError = __dependency3__["default"];
    var inspect = __dependency4__.inspect;
    var computed = __dependency5__.computed;
    var ControllerMixin = __dependency6__["default"];
    var meta = __dependency4__.meta;
    var controllerFor = __dependency7__["default"];

    function verifyNeedsDependencies(controller, container, needs) {
      var dependency, i, l;
      var missing = [];

      for (i=0, l=needs.length; i<l; i++) {
        dependency = needs[i];

        Ember.assert(inspect(controller) + "#needs must not specify dependencies with periods in their names (" +
                     dependency + ")", dependency.indexOf('.') === -1);

        if (dependency.indexOf(':') === -1) {
          dependency = "controller:" + dependency;
        }

        // Structure assert to still do verification but not string concat in production
        if (!container.has(dependency)) {
          missing.push(dependency);
        }
      }
      if (missing.length) {
        throw new EmberError(inspect(controller) + " needs [ " + missing.join(', ') +
                             " ] but " + (missing.length > 1 ? 'they' : 'it') + " could not be found");
      }
    }

    var defaultControllersComputedProperty = computed(function() {
      var controller = this;

      return {
        needs: get(controller, 'needs'),
        container: get(controller, 'container'),
        unknownProperty: function(controllerName) {
          var needs = this.needs;
          var dependency, i, l;

          for (i=0, l=needs.length; i<l; i++) {
            dependency = needs[i];
            if (dependency === controllerName) {
              return this.container.lookup('controller:' + controllerName);
            }
          }

          var errorMessage = inspect(controller) + '#needs does not include `' +
                             controllerName + '`. To access the ' +
                             controllerName + ' controller from ' +
                             inspect(controller) + ', ' +
                             inspect(controller) +
                             ' should have a `needs` property that is an array of the controllers it has access to.';
          throw new ReferenceError(errorMessage);
        },
        setUnknownProperty: function (key, value) {
          throw new Error("You cannot overwrite the value of `controllers." + key + "` of " + inspect(controller));
        }
      };
    });

    /**
      @class ControllerMixin
      @namespace Ember
    */
    ControllerMixin.reopen({
      concatenatedProperties: ['needs'],

      /**
        An array of other controller objects available inside
        instances of this controller via the `controllers`
        property:

        For example, when you define a controller:

        ```javascript
        App.CommentsController = Ember.ArrayController.extend({
          needs: ['post']
        });
        ```

        The application's single instance of these other
        controllers are accessible by name through the
        `controllers` property:

        ```javascript
        this.get('controllers.post'); // instance of App.PostController
        ```

        Given that you have a nested controller (nested resource):

        ```javascript
        App.CommentsNewController = Ember.ObjectController.extend({
        });
        ```

        When you define a controller that requires access to a nested one:

        ```javascript
        App.IndexController = Ember.ObjectController.extend({
          needs: ['commentsNew']
        });
        ```

        You will be able to get access to it:

        ```javascript
        this.get('controllers.commentsNew'); // instance of App.CommentsNewController
        ```

        This is only available for singleton controllers.

        @property {Array} needs
        @default []
      */
      needs: [],

      init: function() {
        var needs = get(this, 'needs');
        var length = get(needs, 'length');

        if (length > 0) {
          Ember.assert(' `' + inspect(this) + ' specifies `needs`, but does ' +
                       "not have a container. Please ensure this controller was " +
                       "instantiated with a container.",
                       this.container || meta(this, false).descs.controllers !== defaultControllersComputedProperty);

          if (this.container) {
            verifyNeedsDependencies(this, this.container, needs);
          }

          // if needs then initialize controllers proxy
          get(this, 'controllers');
        }

        this._super.apply(this, arguments);
      },

      /**
        @method controllerFor
        @see {Ember.Route#controllerFor}
        @deprecated Use `needs` instead
      */
      controllerFor: function(controllerName) {
        Ember.deprecate("Controller#controllerFor is deprecated, please use Controller#needs instead");
        return controllerFor(get(this, 'container'), controllerName);
      },

      /**
        Stores the instances of other controllers available from within
        this controller. Any controller listed by name in the `needs`
        property will be accessible by name through this property.

        ```javascript
        App.CommentsController = Ember.ArrayController.extend({
          needs: ['post'],
          postTitle: function(){
            var currentPost = this.get('controllers.post'); // instance of App.PostController
            return currentPost.get('title');
          }.property('controllers.post.title')
        });
        ```

        @see {Ember.ControllerMixin#needs}
        @property {Object} controllers
        @default null
      */
      controllers: defaultControllersComputedProperty
    });

    __exports__["default"] = ControllerMixin;
  });
enifed("ember-application/system/application",
  ["dag-map","container/container","ember-metal","ember-metal/property_get","ember-metal/property_set","ember-runtime/system/lazy_load","ember-runtime/system/namespace","ember-runtime/mixins/deferred","ember-application/system/resolver","ember-metal/platform","ember-metal/run_loop","ember-metal/utils","ember-runtime/controllers/controller","ember-metal/enumerable_utils","ember-runtime/controllers/object_controller","ember-runtime/controllers/array_controller","ember-handlebars/controls/select","ember-views/system/event_dispatcher","ember-views/system/jquery","ember-routing/system/route","ember-routing/system/router","ember-routing/location/hash_location","ember-routing/location/history_location","ember-routing/location/auto_location","ember-routing/location/none_location","ember-routing/system/cache","ember-extension-support/container_debug_adapter","ember-metal/core","ember-handlebars-compiler","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __dependency10__, __dependency11__, __dependency12__, __dependency13__, __dependency14__, __dependency15__, __dependency16__, __dependency17__, __dependency18__, __dependency19__, __dependency20__, __dependency21__, __dependency22__, __dependency23__, __dependency24__, __dependency25__, __dependency26__, __dependency27__, __dependency28__, __dependency29__, __exports__) {
    "use strict";
    /**
    @module ember
    @submodule ember-application
    */
    var DAG = __dependency1__["default"];
    var Container = __dependency2__["default"];


    var Ember = __dependency3__["default"];
    // Ember.FEATURES, Ember.deprecate, Ember.assert, Ember.libraries, LOG_VERSION, Namespace, BOOTED
    var get = __dependency4__.get;
    var set = __dependency5__.set;
    var runLoadHooks = __dependency6__.runLoadHooks;
    var Namespace = __dependency7__["default"];
    var DeferredMixin = __dependency8__["default"];
    var DefaultResolver = __dependency9__["default"];
    var create = __dependency10__.create;
    var run = __dependency11__["default"];
    var canInvoke = __dependency12__.canInvoke;
    var Controller = __dependency13__["default"];
    var EnumerableUtils = __dependency14__["default"];
    var ObjectController = __dependency15__["default"];
    var ArrayController = __dependency16__["default"];
    var SelectView = __dependency17__["default"];
    var EventDispatcher = __dependency18__["default"];
    var jQuery = __dependency19__["default"];
    var Route = __dependency20__["default"];
    var Router = __dependency21__["default"];
    var HashLocation = __dependency22__["default"];
    var HistoryLocation = __dependency23__["default"];
    var AutoLocation = __dependency24__["default"];
    var NoneLocation = __dependency25__["default"];
    var BucketCache = __dependency26__["default"];

    // this is technically incorrect (per @wycats)
    // it should work properly with:
    // `import ContainerDebugAdapter from 'ember-extension-support/container_debug_adapter';` but
    // es6-module-transpiler 0.4.0 eagerly grabs the module (which is undefined)

    var ContainerDebugAdapter = __dependency27__["default"];

    var K = __dependency28__.K;
    var EmberHandlebars = __dependency29__["default"];

    function props(obj) {
      var properties = [];

      for (var key in obj) {
        properties.push(key);
      }

      return properties;
    }

    /**
      An instance of `Ember.Application` is the starting point for every Ember
      application. It helps to instantiate, initialize and coordinate the many
      objects that make up your app.

      Each Ember app has one and only one `Ember.Application` object. In fact, the
      very first thing you should do in your application is create the instance:

      ```javascript
      window.App = Ember.Application.create();
      ```

      Typically, the application object is the only global variable. All other
      classes in your app should be properties on the `Ember.Application` instance,
      which highlights its first role: a global namespace.

      For example, if you define a view class, it might look like this:

      ```javascript
      App.MyView = Ember.View.extend();
      ```

      By default, calling `Ember.Application.create()` will automatically initialize
      your application by calling the `Ember.Application.initialize()` method. If
      you need to delay initialization, you can call your app's `deferReadiness()`
      method. When you are ready for your app to be initialized, call its
      `advanceReadiness()` method.

      You can define a `ready` method on the `Ember.Application` instance, which
      will be run by Ember when the application is initialized.

      Because `Ember.Application` inherits from `Ember.Namespace`, any classes
      you create will have useful string representations when calling `toString()`.
      See the `Ember.Namespace` documentation for more information.

      While you can think of your `Ember.Application` as a container that holds the
      other classes in your application, there are several other responsibilities
      going on under-the-hood that you may want to understand.

      ### Event Delegation

      Ember uses a technique called _event delegation_. This allows the framework
      to set up a global, shared event listener instead of requiring each view to
      do it manually. For example, instead of each view registering its own
      `mousedown` listener on its associated element, Ember sets up a `mousedown`
      listener on the `body`.

      If a `mousedown` event occurs, Ember will look at the target of the event and
      start walking up the DOM node tree, finding corresponding views and invoking
      their `mouseDown` method as it goes.

      `Ember.Application` has a number of default events that it listens for, as
      well as a mapping from lowercase events to camel-cased view method names. For
      example, the `keypress` event causes the `keyPress` method on the view to be
      called, the `dblclick` event causes `doubleClick` to be called, and so on.

      If there is a bubbling browser event that Ember does not listen for by
      default, you can specify custom events and their corresponding view method
      names by setting the application's `customEvents` property:

      ```javascript
      var App = Ember.Application.create({
        customEvents: {
          // add support for the paste event
          paste: 'paste'
        }
      });
      ```

      By default, the application sets up these event listeners on the document
      body. However, in cases where you are embedding an Ember application inside
      an existing page, you may want it to set up the listeners on an element
      inside the body.

      For example, if only events inside a DOM element with the ID of `ember-app`
      should be delegated, set your application's `rootElement` property:

      ```javascript
      var App = Ember.Application.create({
        rootElement: '#ember-app'
      });
      ```

      The `rootElement` can be either a DOM element or a jQuery-compatible selector
      string. Note that *views appended to the DOM outside the root element will
      not receive events.* If you specify a custom root element, make sure you only
      append views inside it!

      To learn more about the advantages of event delegation and the Ember view
      layer, and a list of the event listeners that are setup by default, visit the
      [Ember View Layer guide](http://emberjs.com/guides/understanding-ember/the-view-layer/#toc_event-delegation).

      ### Initializers

      Libraries on top of Ember can add initializers, like so:

      ```javascript
      Ember.Application.initializer({
        name: 'api-adapter',

        initialize: function(container, application) {
          application.register('api-adapter:main', ApiAdapter);
        }
      });
      ```

      Initializers provide an opportunity to access the container, which
      organizes the different components of an Ember application. Additionally
      they provide a chance to access the instantiated application. Beyond
      being used for libraries, initializers are also a great way to organize
      dependency injection or setup in your own application.

      ### Routing

      In addition to creating your application's router, `Ember.Application` is
      also responsible for telling the router when to start routing. Transitions
      between routes can be logged with the `LOG_TRANSITIONS` flag, and more
      detailed intra-transition logging can be logged with
      the `LOG_TRANSITIONS_INTERNAL` flag:

      ```javascript
      var App = Ember.Application.create({
        LOG_TRANSITIONS: true, // basic logging of successful transitions
        LOG_TRANSITIONS_INTERNAL: true // detailed logging of all routing steps
      });
      ```

      By default, the router will begin trying to translate the current URL into
      application state once the browser emits the `DOMContentReady` event. If you
      need to defer routing, you can call the application's `deferReadiness()`
      method. Once routing can begin, call the `advanceReadiness()` method.

      If there is any setup required before routing begins, you can implement a
      `ready()` method on your app that will be invoked immediately before routing
      begins.
      ```

      @class Application
      @namespace Ember
      @extends Ember.Namespace
    */

    var Application = Namespace.extend(DeferredMixin, {
      _suppressDeferredDeprecation: true,

      /**
        The root DOM element of the Application. This can be specified as an
        element or a
        [jQuery-compatible selector string](http://api.jquery.com/category/selectors/).

        This is the element that will be passed to the Application's,
        `eventDispatcher`, which sets up the listeners for event delegation. Every
        view in your application should be a child of the element you specify here.

        @property rootElement
        @type DOMElement
        @default 'body'
      */
      rootElement: 'body',

      /**
        The `Ember.EventDispatcher` responsible for delegating events to this
        application's views.

        The event dispatcher is created by the application at initialization time
        and sets up event listeners on the DOM element described by the
        application's `rootElement` property.

        See the documentation for `Ember.EventDispatcher` for more information.

        @property eventDispatcher
        @type Ember.EventDispatcher
        @default null
      */
      eventDispatcher: null,

      /**
        The DOM events for which the event dispatcher should listen.

        By default, the application's `Ember.EventDispatcher` listens
        for a set of standard DOM events, such as `mousedown` and
        `keyup`, and delegates them to your application's `Ember.View`
        instances.

        If you would like additional bubbling events to be delegated to your
        views, set your `Ember.Application`'s `customEvents` property
        to a hash containing the DOM event name as the key and the
        corresponding view method name as the value. For example:

        ```javascript
        var App = Ember.Application.create({
          customEvents: {
            // add support for the paste event
            paste: 'paste'
          }
        });
        ```

        @property customEvents
        @type Object
        @default null
      */
      customEvents: null,

      // Start off the number of deferrals at 1. This will be
      // decremented by the Application's own `initialize` method.
      _readinessDeferrals: 1,

      init: function() {
        if (!this.$) {
          this.$ = jQuery;
        }
        this.__container__ = this.buildContainer();

        this.Router = this.defaultRouter();

        this._super();

        this.scheduleInitialize();

        Ember.libraries.registerCoreLibrary('Handlebars' + (EmberHandlebars.compile ? '' : '-runtime'), EmberHandlebars.VERSION);
        Ember.libraries.registerCoreLibrary('jQuery', jQuery().jquery);

        if ( Ember.LOG_VERSION ) {
          Ember.LOG_VERSION = false; // we only need to see this once per Application#init

          var nameLengths = EnumerableUtils.map(Ember.libraries, function(item) {
            return get(item, "name.length");
          });

          var maxNameLength = Math.max.apply(this, nameLengths);

          Ember.debug('-------------------------------');
          Ember.libraries.each(function(name, version) {
            var spaces = new Array(maxNameLength - name.length + 1).join(" ");
            Ember.debug([name, spaces, ' : ', version].join(""));
          });
          Ember.debug('-------------------------------');
        }
      },

      /**
        Build the container for the current application.

        Also register a default application view in case the application
        itself does not.

        @private
        @method buildContainer
        @return {Ember.Container} the configured container
      */
      buildContainer: function() {
        var container = this.__container__ = Application.buildContainer(this);

        return container;
      },

      /**
        If the application has not opted out of routing and has not explicitly
        defined a router, supply a default router for the application author
        to configure.

        This allows application developers to do:

        ```javascript
        var App = Ember.Application.create();

        App.Router.map(function() {
          this.resource('posts');
        });
        ```

        @private
        @method defaultRouter
        @return {Ember.Router} the default router
      */

      defaultRouter: function() {
        if (this.Router === false) { return; }
        var container = this.__container__;

        if (this.Router) {
          container.unregister('router:main');
          container.register('router:main', this.Router);
        }

        return container.lookupFactory('router:main');
      },

      /**
        Automatically initialize the application once the DOM has
        become ready.

        The initialization itself is scheduled on the actions queue
        which ensures that application loading finishes before
        booting.

        If you are asynchronously loading code, you should call
        `deferReadiness()` to defer booting, and then call
        `advanceReadiness()` once all of your code has finished
        loading.

        @private
        @method scheduleInitialize
      */
      scheduleInitialize: function() {
        var self = this;

        if (!this.$ || this.$.isReady) {
          run.schedule('actions', self, '_initialize');
        } else {
          this.$().ready(function runInitialize() {
            run(self, '_initialize');
          });
        }
      },

      /**
        Use this to defer readiness until some condition is true.

        Example:

        ```javascript
        var App = Ember.Application.create();

        App.deferReadiness();
        // Ember.$ is a reference to the jQuery object/function
        Ember.$.getJSON('/auth-token', function(token) {
          App.token = token;
          App.advanceReadiness();
        });
        ```

        This allows you to perform asynchronous setup logic and defer
        booting your application until the setup has finished.

        However, if the setup requires a loading UI, it might be better
        to use the router for this purpose.

        @method deferReadiness
      */
      deferReadiness: function() {
        Ember.assert("You must call deferReadiness on an instance of Ember.Application", this instanceof Application);
        Ember.assert("You cannot defer readiness since the `ready()` hook has already been called.", this._readinessDeferrals > 0);
        this._readinessDeferrals++;
      },

      /**
        Call `advanceReadiness` after any asynchronous setup logic has completed.
        Each call to `deferReadiness` must be matched by a call to `advanceReadiness`
        or the application will never become ready and routing will not begin.

        @method advanceReadiness
        @see {Ember.Application#deferReadiness}
      */
      advanceReadiness: function() {
        Ember.assert("You must call advanceReadiness on an instance of Ember.Application", this instanceof Application);
        this._readinessDeferrals--;

        if (this._readinessDeferrals === 0) {
          run.once(this, this.didBecomeReady);
        }
      },

      /**
        Registers a factory that can be used for dependency injection (with
        `App.inject`) or for service lookup. Each factory is registered with
        a full name including two parts: `type:name`.

        A simple example:

        ```javascript
        var App = Ember.Application.create();

        App.Orange = Ember.Object.extend();
        App.register('fruit:favorite', App.Orange);
        ```

        Ember will resolve factories from the `App` namespace automatically.
        For example `App.CarsController` will be discovered and returned if
        an application requests `controller:cars`.

        An example of registering a controller with a non-standard name:

        ```javascript
        var App = Ember.Application.create();
        var Session = Ember.Controller.extend();

        App.register('controller:session', Session);

        // The Session controller can now be treated like a normal controller,
        // despite its non-standard name.
        App.ApplicationController = Ember.Controller.extend({
          needs: ['session']
        });
        ```

        Registered factories are **instantiated** by having `create`
        called on them. Additionally they are **singletons**, each time
        they are looked up they return the same instance.

        Some examples modifying that default behavior:

        ```javascript
        var App = Ember.Application.create();

        App.Person  = Ember.Object.extend();
        App.Orange  = Ember.Object.extend();
        App.Email   = Ember.Object.extend();
        App.session = Ember.Object.create();

        App.register('model:user', App.Person, { singleton: false });
        App.register('fruit:favorite', App.Orange);
        App.register('communication:main', App.Email, { singleton: false });
        App.register('session', App.session, { instantiate: false });
        ```

        @method register
        @param  fullName {String} type:name (e.g., 'model:user')
        @param  factory {Function} (e.g., App.Person)
        @param  options {Object} (optional) disable instantiation or singleton usage
      **/
      register: function() {
        var container = this.__container__;
        container.register.apply(container, arguments);
      },

      /**
        Define a dependency injection onto a specific factory or all factories
        of a type.

        When Ember instantiates a controller, view, or other framework component
        it can attach a dependency to that component. This is often used to
        provide services to a set of framework components.

        An example of providing a session object to all controllers:

        ```javascript
        var App = Ember.Application.create();
        var Session = Ember.Object.extend({ isAuthenticated: false });

        // A factory must be registered before it can be injected
        App.register('session:main', Session);

        // Inject 'session:main' onto all factories of the type 'controller'
        // with the name 'session'
        App.inject('controller', 'session', 'session:main');

        App.IndexController = Ember.Controller.extend({
          isLoggedIn: Ember.computed.alias('session.isAuthenticated')
        });
        ```

        Injections can also be performed on specific factories.

        ```javascript
        App.inject(<full_name or type>, <property name>, <full_name>)
        App.inject('route', 'source', 'source:main')
        App.inject('route:application', 'email', 'model:email')
        ```

        It is important to note that injections can only be performed on
        classes that are instantiated by Ember itself. Instantiating a class
        directly (via `create` or `new`) bypasses the dependency injection
        system.

        **Note:** Ember-Data instantiates its models in a unique manner, and consequently
        injections onto models (or all models) will not work as expected. Injections
        on models can be enabled by setting `Ember.MODEL_FACTORY_INJECTIONS`
        to `true`.

        @method inject
        @param  factoryNameOrType {String}
        @param  property {String}
        @param  injectionName {String}
      **/
      inject: function() {
        var container = this.__container__;
        container.injection.apply(container, arguments);
      },

      /**
        Calling initialize manually is not supported.

        Please see Ember.Application#advanceReadiness and
        Ember.Application#deferReadiness.

        @private
        @deprecated
        @method initialize
       **/
      initialize: function() {
        Ember.deprecate('Calling initialize manually is not supported. Please see Ember.Application#advanceReadiness and Ember.Application#deferReadiness');
      },

      /**
        Initialize the application. This happens automatically.

        Run any initializers and run the application load hook. These hooks may
        choose to defer readiness. For example, an authentication hook might want
        to defer readiness until the auth token has been retrieved.

        @private
        @method _initialize
      */
      _initialize: function() {
        if (this.isDestroyed) { return; }

        // At this point, the App.Router must already be assigned
        if (this.Router) {
          var container = this.__container__;
          container.unregister('router:main');
          container.register('router:main', this.Router);
        }

        this.runInitializers();
        runLoadHooks('application', this);

        // At this point, any initializers or load hooks that would have wanted
        // to defer readiness have fired. In general, advancing readiness here
        // will proceed to didBecomeReady.
        this.advanceReadiness();

        return this;
      },

      /**
        Reset the application. This is typically used only in tests. It cleans up
        the application in the following order:

        1. Deactivate existing routes
        2. Destroy all objects in the container
        3. Create a new application container
        4. Re-route to the existing url

        Typical Example:

        ```javascript
        var App;

        run(function() {
          App = Ember.Application.create();
        });

        module('acceptance test', {
          setup: function() {
            App.reset();
          }
        });

        test('first test', function() {
          // App is freshly reset
        });

        test('second test', function() {
          // App is again freshly reset
        });
        ```

        Advanced Example:

        Occasionally you may want to prevent the app from initializing during
        setup. This could enable extra configuration, or enable asserting prior
        to the app becoming ready.

        ```javascript
        var App;

        run(function() {
          App = Ember.Application.create();
        });

        module('acceptance test', {
          setup: function() {
            run(function() {
              App.reset();
              App.deferReadiness();
            });
          }
        });

        test('first test', function() {
          ok(true, 'something before app is initialized');

          run(function() {
            App.advanceReadiness();
          });

          ok(true, 'something after app is initialized');
        });
        ```

        @method reset
      **/
      reset: function() {
        this._readinessDeferrals = 1;

        function handleReset() {
          var router = this.__container__.lookup('router:main');
          router.reset();

          run(this.__container__, 'destroy');

          this.buildContainer();

          run.schedule('actions', this, function() {
            this._initialize();
          });
        }

        run.join(this, handleReset);
      },

      /**
        @private
        @method runInitializers
      */
      runInitializers: function() {
        var initializersByName = get(this.constructor, 'initializers');
        var initializers = props(initializersByName);
        var container = this.__container__;
        var graph = new DAG();
        var namespace = this;
        var initializer;

        for (var i = 0; i < initializers.length; i++) {
          initializer = initializersByName[initializers[i]];
          graph.addEdges(initializer.name, initializer.initialize, initializer.before, initializer.after);
        }

        graph.topsort(function (vertex) {
          var initializer = vertex.value;
          Ember.assert("No application initializer named '" + vertex.name + "'", initializer);
          initializer(container, namespace);
        });
      },

      /**
        @private
        @method didBecomeReady
      */
      didBecomeReady: function() {
        this.setupEventDispatcher();
        this.ready(); // user hook
        this.startRouting();

        if (!Ember.testing) {
          // Eagerly name all classes that are already loaded
          Ember.Namespace.processAll();
          Ember.BOOTED = true;
        }

        this.resolve(this);
      },

      /**
        Setup up the event dispatcher to receive events on the
        application's `rootElement` with any registered
        `customEvents`.

        @private
        @method setupEventDispatcher
      */
      setupEventDispatcher: function() {
        var customEvents = get(this, 'customEvents');
        var rootElement = get(this, 'rootElement');
        var dispatcher = this.__container__.lookup('event_dispatcher:main');

        set(this, 'eventDispatcher', dispatcher);
        dispatcher.setup(customEvents, rootElement);
      },

      /**
        If the application has a router, use it to route to the current URL, and
        trigger a new call to `route` whenever the URL changes.

        @private
        @method startRouting
        @property router {Ember.Router}
      */
      startRouting: function() {
        var router = this.__container__.lookup('router:main');
        if (!router) { return; }

        router.startRouting();
      },

      handleURL: function(url) {
        var router = this.__container__.lookup('router:main');

        router.handleURL(url);
      },

      /**
        Called when the Application has become ready.
        The call will be delayed until the DOM has become ready.

        @event ready
      */
      ready: K,

      /**
        @deprecated Use 'Resolver' instead
        Set this to provide an alternate class to `Ember.DefaultResolver`


        @property resolver
      */
      resolver: null,

      /**
        Set this to provide an alternate class to `Ember.DefaultResolver`

        @property resolver
      */
      Resolver: null,

      willDestroy: function() {
        Ember.BOOTED = false;
        // Ensure deactivation of routes before objects are destroyed
        this.__container__.lookup('router:main').reset();

        this.__container__.destroy();
      },

      initializer: function(options) {
        this.constructor.initializer(options);
      },

      /**
        @method then
        @private
        @deprecated
      */
      then: function() {
        Ember.deprecate('Do not use `.then` on an instance of Ember.Application.  Please use the `.ready` hook instead.');

        this._super.apply(this, arguments);
      }
    });

    Application.reopenClass({
      initializers: create(null),

      /**
        Initializer receives an object which has the following attributes:
        `name`, `before`, `after`, `initialize`. The only required attribute is
        `initialize, all others are optional.

        * `name` allows you to specify under which name the initializer is registered.
        This must be a unique name, as trying to register two initializers with the
        same name will result in an error.

        ```javascript
        Ember.Application.initializer({
          name: 'namedInitializer',

          initialize: function(container, application) {
            Ember.debug('Running namedInitializer!');
          }
        });
        ```

        * `before` and `after` are used to ensure that this initializer is ran prior
        or after the one identified by the value. This value can be a single string
        or an array of strings, referencing the `name` of other initializers.

        An example of ordering initializers, we create an initializer named `first`:

        ```javascript
        Ember.Application.initializer({
          name: 'first',

          initialize: function(container, application) {
            Ember.debug('First initializer!');
          }
        });

        // DEBUG: First initializer!
        ```

        We add another initializer named `second`, specifying that it should run
        after the initializer named `first`:

        ```javascript
        Ember.Application.initializer({
          name: 'second',
          after: 'first',

          initialize: function(container, application) {
            Ember.debug('Second initializer!');
          }
        });

        // DEBUG: First initializer!
        // DEBUG: Second initializer!
        ```

        Afterwards we add a further initializer named `pre`, this time specifying
        that it should run before the initializer named `first`:

        ```javascript
        Ember.Application.initializer({
          name: 'pre',
          before: 'first',

          initialize: function(container, application) {
            Ember.debug('Pre initializer!');
          }
        });

        // DEBUG: Pre initializer!
        // DEBUG: First initializer!
        // DEBUG: Second initializer!
        ```

        Finally we add an initializer named `post`, specifying it should run after
        both the `first` and the `second` initializers:

        ```javascript
        Ember.Application.initializer({
          name: 'post',
          after: ['first', 'second'],

          initialize: function(container, application) {
            Ember.debug('Post initializer!');
          }
        });

        // DEBUG: Pre initializer!
        // DEBUG: First initializer!
        // DEBUG: Second initializer!
        // DEBUG: Post initializer!
        ```

        * `initialize` is a callback function that receives two arguments, `container`
        and `application` on which you can operate.

        Example of using `container` to preload data into the store:

        ```javascript
        Ember.Application.initializer({
          name: 'preload-data',

          initialize: function(container, application) {
            var store = container.lookup('store:main');

            store.pushPayload(preloadedData);
          }
        });
        ```

        Example of using `application` to register an adapter:

        ```javascript
        Ember.Application.initializer({
          name: 'api-adapter',

          initialize: function(container, application) {
            application.register('api-adapter:main', ApiAdapter);
          }
        });
        ```

        @method initializer
        @param initializer {Object}
       */
      initializer: function(initializer) {
        // If this is the first initializer being added to a subclass, we are going to reopen the class
        // to make sure we have a new `initializers` object, which extends from the parent class' using
        // prototypal inheritance. Without this, attempting to add initializers to the subclass would
        // pollute the parent class as well as other subclasses.
        if (this.superclass.initializers !== undefined && this.superclass.initializers === this.initializers) {
          this.reopenClass({
            initializers: create(this.initializers)
          });
        }

        Ember.assert("The initializer '" + initializer.name + "' has already been registered", !this.initializers[initializer.name]);
        Ember.assert("An initializer cannot be registered without an initialize function", canInvoke(initializer, 'initialize'));
        Ember.assert("An initializer cannot be registered without a name property", initializer.name !== undefined);

        this.initializers[initializer.name] = initializer;
      },

      /**
        This creates a container with the default Ember naming conventions.

        It also configures the container:

        * registered views are created every time they are looked up (they are
          not singletons)
        * registered templates are not factories; the registered value is
          returned directly.
        * the router receives the application as its `namespace` property
        * all controllers receive the router as their `target` and `controllers`
          properties
        * all controllers receive the application as their `namespace` property
        * the application view receives the application controller as its
          `controller` property
        * the application view receives the application template as its
          `defaultTemplate` property

        @private
        @method buildContainer
        @static
        @param {Ember.Application} namespace the application to build the
          container for.
        @return {Ember.Container} the built container
      */
      buildContainer: function(namespace) {
        var container = new Container();

        container.set = set;
        container.resolver = resolverFor(namespace);
        container.normalizeFullName = container.resolver.normalize;
        container.describe = container.resolver.describe;
        container.makeToString = container.resolver.makeToString;

        container.optionsForType('component', { singleton: false });
        container.optionsForType('view', { singleton: false });
        container.optionsForType('template', { instantiate: false });
        container.optionsForType('helper', { instantiate: false });

        container.register('application:main', namespace, { instantiate: false });

        container.register('controller:basic', Controller, { instantiate: false });
        container.register('controller:object', ObjectController, { instantiate: false });
        container.register('controller:array', ArrayController, { instantiate: false });

        container.register('view:select', SelectView);

        container.register('route:basic', Route, { instantiate: false });
        container.register('event_dispatcher:main', EventDispatcher);

        container.register('router:main',  Router);
        container.injection('router:main', 'namespace', 'application:main');

        container.register('location:auto', AutoLocation);
        container.register('location:hash', HashLocation);
        container.register('location:history', HistoryLocation);
        container.register('location:none', NoneLocation);

        container.injection('controller', 'target', 'router:main');
        container.injection('controller', 'namespace', 'application:main');

        container.register('-bucket-cache:main', BucketCache);
        container.injection('router', '_bucketCache', '-bucket-cache:main');
        container.injection('route',  '_bucketCache', '-bucket-cache:main');
        container.injection('controller',  '_bucketCache', '-bucket-cache:main');

        container.injection('route', 'router', 'router:main');
        container.injection('location', 'rootURL', '-location-setting:root-url');

        // DEBUGGING
        container.register('resolver-for-debugging:main', container.resolver.__resolver__, { instantiate: false });
        container.injection('container-debug-adapter:main', 'resolver', 'resolver-for-debugging:main');
        container.injection('data-adapter:main', 'containerDebugAdapter', 'container-debug-adapter:main');
        // Custom resolver authors may want to register their own ContainerDebugAdapter with this key

        container.register('container-debug-adapter:main', ContainerDebugAdapter);

        return container;
      }
    });

    /**
      This function defines the default lookup rules for container lookups:

      * templates are looked up on `Ember.TEMPLATES`
      * other names are looked up on the application after classifying the name.
        For example, `controller:post` looks up `App.PostController` by default.
      * if the default lookup fails, look for registered classes on the container

      This allows the application to register default injections in the container
      that could be overridden by the normal naming convention.

      @private
      @method resolverFor
      @param {Ember.Namespace} namespace the namespace to look for classes
      @return {*} the resolved value for a given lookup
    */
    function resolverFor(namespace) {
      if (namespace.get('resolver')) {
        Ember.deprecate('Application.resolver is deprecated in favor of Application.Resolver', false);
      }

      var ResolverClass = namespace.get('resolver') || namespace.get('Resolver') || DefaultResolver;
      var resolver = ResolverClass.create({
        namespace: namespace
      });

      function resolve(fullName) {
        return resolver.resolve(fullName);
      }

      resolve.describe = function(fullName) {
        return resolver.lookupDescription(fullName);
      };

      resolve.makeToString = function(factory, fullName) {
        return resolver.makeToString(factory, fullName);
      };

      resolve.normalize = function(fullName) {
        if (resolver.normalize) {
          return resolver.normalize(fullName);
        } else {
          Ember.deprecate('The Resolver should now provide a \'normalize\' function', false);
          return fullName;
        }
      };

      resolve.__resolver__ = resolver;

      return resolve;
    }

    __exports__["default"] = Application;
  });
enifed("ember-application/system/resolver",
  ["ember-metal/core","ember-metal/property_get","ember-metal/logger","ember-runtime/system/string","ember-runtime/system/object","ember-runtime/system/namespace","ember-handlebars","ember-metal/dictionary","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __exports__) {
    "use strict";
    /**
    @module ember
    @submodule ember-application
    */

    var Ember = __dependency1__["default"];
    // Ember.TEMPLATES, Ember.assert
    var get = __dependency2__.get;
    var Logger = __dependency3__["default"];
    var classify = __dependency4__.classify;
    var capitalize = __dependency4__.capitalize;
    var decamelize = __dependency4__.decamelize;
    var EmberObject = __dependency5__["default"];
    var Namespace = __dependency6__["default"];
    var EmberHandlebars = __dependency7__["default"];

    var Resolver = EmberObject.extend({
      /**
        This will be set to the Application instance when it is
        created.

        @property namespace
      */
      namespace: null,
      normalize:         Ember.required(Function),
      resolve:           Ember.required(Function),
      parseName:         Ember.required(Function),
      lookupDescription: Ember.required(Function),
      makeToString:      Ember.required(Function),
      resolveOther:      Ember.required(Function),
      _logLookup:        Ember.required(Function)
    });
    __exports__.Resolver = Resolver;
    /**
      The DefaultResolver defines the default lookup rules to resolve
      container lookups before consulting the container for registered
      items:

      * templates are looked up on `Ember.TEMPLATES`
      * other names are looked up on the application after converting
        the name. For example, `controller:post` looks up
        `App.PostController` by default.
      * there are some nuances (see examples below)

      ### How Resolving Works

      The container calls this object's `resolve` method with the
      `fullName` argument.

      It first parses the fullName into an object using `parseName`.

      Then it checks for the presence of a type-specific instance
      method of the form `resolve[Type]` and calls it if it exists.
      For example if it was resolving 'template:post', it would call
      the `resolveTemplate` method.

      Its last resort is to call the `resolveOther` method.

      The methods of this object are designed to be easy to override
      in a subclass. For example, you could enhance how a template
      is resolved like so:

      ```javascript
      App = Ember.Application.create({
        Resolver: Ember.DefaultResolver.extend({
          resolveTemplate: function(parsedName) {
            var resolvedTemplate = this._super(parsedName);
            if (resolvedTemplate) { return resolvedTemplate; }
            return Ember.TEMPLATES['not_found'];
          }
        })
      });
      ```

      Some examples of how names are resolved:

      ```
      'template:post'           //=> Ember.TEMPLATES['post']
      'template:posts/byline'   //=> Ember.TEMPLATES['posts/byline']
      'template:posts.byline'   //=> Ember.TEMPLATES['posts/byline']
      'template:blogPost'       //=> Ember.TEMPLATES['blogPost']
                                //   OR
                                //   Ember.TEMPLATES['blog_post']
      'controller:post'         //=> App.PostController
      'controller:posts.index'  //=> App.PostsIndexController
      'controller:blog/post'    //=> Blog.PostController
      'controller:basic'        //=> Ember.Controller
      'route:post'              //=> App.PostRoute
      'route:posts.index'       //=> App.PostsIndexRoute
      'route:blog/post'         //=> Blog.PostRoute
      'route:basic'             //=> Ember.Route
      'view:post'               //=> App.PostView
      'view:posts.index'        //=> App.PostsIndexView
      'view:blog/post'          //=> Blog.PostView
      'view:basic'              //=> Ember.View
      'foo:post'                //=> App.PostFoo
      'model:post'              //=> App.Post
      ```

      @class DefaultResolver
      @namespace Ember
      @extends Ember.Object
    */
    var dictionary = __dependency8__["default"];

    __exports__["default"] = EmberObject.extend({
      /**
        This will be set to the Application instance when it is
        created.

        @property namespace
      */
      namespace: null,

      init: function() {
        this._parseNameCache = dictionary(null);
      },
      normalize: function(fullName) {
        var split = fullName.split(':', 2);
        var type = split[0];
        var name = split[1];

        Ember.assert("Tried to normalize a container name without a colon (:) in it." +
                     " You probably tried to lookup a name that did not contain a type," +
                     " a colon, and a name. A proper lookup name would be `view:post`.", split.length === 2);

        if (type !== 'template') {
          var result = name;

          if (result.indexOf('.') > -1) {
            result = result.replace(/\.(.)/g, function(m) {
              return m.charAt(1).toUpperCase();
            });
          }

          if (name.indexOf('_') > -1) {
            result = result.replace(/_(.)/g, function(m) {
              return m.charAt(1).toUpperCase();
            });
          }

          return type + ':' + result;
        } else {
          return fullName;
        }
      },


      /**
        This method is called via the container's resolver method.
        It parses the provided `fullName` and then looks up and
        returns the appropriate template or class.

        @method resolve
        @param {String} fullName the lookup string
        @return {Object} the resolved factory
      */
      resolve: function(fullName) {
        var parsedName = this.parseName(fullName);
        var resolveMethodName = parsedName.resolveMethodName;
        var resolved;

        if (!(parsedName.name && parsedName.type)) {
          throw new TypeError('Invalid fullName: `' + fullName + '`, must be of the form `type:name` ');
        }

        if (this[resolveMethodName]) {
          resolved = this[resolveMethodName](parsedName);
        }

        if (!resolved) {
          resolved = this.resolveOther(parsedName);
        }

        if (parsedName.root && parsedName.root.LOG_RESOLVER) {
          this._logLookup(resolved, parsedName);
        }

        return resolved;
      },
      /**
        Convert the string name of the form 'type:name' to
        a Javascript object with the parsed aspects of the name
        broken out.

        @protected
        @param {String} fullName the lookup string
        @method parseName
      */

      parseName: function(fullName) {
        return this._parseNameCache[fullName] || (
          this._parseNameCache[fullName] = this._parseName(fullName)
        );
      },

      _parseName: function(fullName) {
        var nameParts = fullName.split(':');
        var type = nameParts[0], fullNameWithoutType = nameParts[1];
        var name = fullNameWithoutType;
        var namespace = get(this, 'namespace');
        var root = namespace;

        if (type !== 'template' && name.indexOf('/') !== -1) {
          var parts = name.split('/');
          name = parts[parts.length - 1];
          var namespaceName = capitalize(parts.slice(0, -1).join('.'));
          root = Namespace.byName(namespaceName);

          Ember.assert('You are looking for a ' + name + ' ' + type +
                       ' in the ' + namespaceName +
                       ' namespace, but the namespace could not be found', root);
        }

        return {
          fullName: fullName,
          type: type,
          fullNameWithoutType: fullNameWithoutType,
          name: name,
          root: root,
          resolveMethodName: 'resolve' + classify(type)
        };
      },

      /**
        Returns a human-readable description for a fullName. Used by the
        Application namespace in assertions to describe the
        precise name of the class that Ember is looking for, rather than
        container keys.

        @protected
        @param {String} fullName the lookup string
        @method lookupDescription
      */
      lookupDescription: function(fullName) {
        var parsedName = this.parseName(fullName);

        if (parsedName.type === 'template') {
          return 'template at ' + parsedName.fullNameWithoutType.replace(/\./g, '/');
        }

        var description = parsedName.root + '.' + classify(parsedName.name);

        if (parsedName.type !== 'model') {
          description += classify(parsedName.type);
        }

        return description;
      },

      makeToString: function(factory, fullName) {
        return factory.toString();
      },
      /**
        Given a parseName object (output from `parseName`), apply
        the conventions expected by `Ember.Router`

        @protected
        @param {Object} parsedName a parseName object with the parsed
          fullName lookup string
        @method useRouterNaming
      */
      useRouterNaming: function(parsedName) {
        parsedName.name = parsedName.name.replace(/\./g, '_');
        if (parsedName.name === 'basic') {
          parsedName.name = '';
        }
      },
      /**
        Look up the template in Ember.TEMPLATES

        @protected
        @param {Object} parsedName a parseName object with the parsed
          fullName lookup string
        @method resolveTemplate
      */
      resolveTemplate: function(parsedName) {
        var templateName = parsedName.fullNameWithoutType.replace(/\./g, '/');

        if (Ember.TEMPLATES[templateName]) {
          return Ember.TEMPLATES[templateName];
        }

        templateName = decamelize(templateName);
        if (Ember.TEMPLATES[templateName]) {
          return Ember.TEMPLATES[templateName];
        }
      },

      /**
        Lookup the view using `resolveOther`

        @protected
        @param {Object} parsedName a parseName object with the parsed
          fullName lookup string
        @method resolveView
      */
      resolveView: function(parsedName) {
        this.useRouterNaming(parsedName);
        return this.resolveOther(parsedName);
      },

      /**
        Lookup the controller using `resolveOther`

        @protected
        @param {Object} parsedName a parseName object with the parsed
          fullName lookup string
        @method resolveController
      */
      resolveController: function(parsedName) {
        this.useRouterNaming(parsedName);
        return this.resolveOther(parsedName);
      },
      /**
        Lookup the route using `resolveOther`

        @protected
        @param {Object} parsedName a parseName object with the parsed
          fullName lookup string
        @method resolveRoute
      */
      resolveRoute: function(parsedName) {
        this.useRouterNaming(parsedName);
        return this.resolveOther(parsedName);
      },

      /**
        Lookup the model on the Application namespace

        @protected
        @param {Object} parsedName a parseName object with the parsed
          fullName lookup string
        @method resolveModel
      */
      resolveModel: function(parsedName) {
        var className = classify(parsedName.name);
        var factory = get(parsedName.root, className);

         if (factory) { return factory; }
      },
      /**
        Look up the specified object (from parsedName) on the appropriate
        namespace (usually on the Application)

        @protected
        @param {Object} parsedName a parseName object with the parsed
          fullName lookup string
        @method resolveHelper
      */
      resolveHelper: function(parsedName) {
        return this.resolveOther(parsedName) || EmberHandlebars.helpers[parsedName.fullNameWithoutType];
      },
      /**
        Look up the specified object (from parsedName) on the appropriate
        namespace (usually on the Application)

        @protected
        @param {Object} parsedName a parseName object with the parsed
          fullName lookup string
        @method resolveOther
      */
      resolveOther: function(parsedName) {
        var className = classify(parsedName.name) + classify(parsedName.type);
        var factory = get(parsedName.root, className);
        if (factory) { return factory; }
      },

      /**
       @method _logLookup
       @param {Boolean} found
       @param {Object} parsedName
       @private
      */
      _logLookup: function(found, parsedName) {
        var symbol, padding;

        if (found) { symbol = '[âœ“]'; }
        else       { symbol = '[ ]'; }

        if (parsedName.fullName.length > 60) {
          padding = '.';
        } else {
          padding = new Array(60 - parsedName.fullName.length).join('.');
        }

        Logger.info(symbol, parsedName.fullName, padding, this.lookupDescription(parsedName.fullName));
      }
    });
  });
enifed("ember-debug",
  ["ember-metal/core","ember-metal/error","ember-metal/logger","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    /*global __fail__*/

    var Ember = __dependency1__["default"];
    var EmberError = __dependency2__["default"];
    var Logger = __dependency3__["default"];

    /**
    Ember Debug

    @module ember
    @submodule ember-debug
    */

    /**
    @class Ember
    */

    /**
      Define an assertion that will throw an exception if the condition is not
      met. Ember build tools will remove any calls to `Ember.assert()` when
      doing a production build. Example:

      ```javascript
      // Test for truthiness
      Ember.assert('Must pass a valid object', obj);

      // Fail unconditionally
      Ember.assert('This code path should never be run');
      ```

      @method assert
      @param {String} desc A description of the assertion. This will become
        the text of the Error thrown if the assertion fails.
      @param {Boolean} test Must be truthy for the assertion to pass. If
        falsy, an exception will be thrown.
    */
    Ember.assert = function(desc, test) {
      if (!test) {
        throw new EmberError("Assertion Failed: " + desc);
      }
    };


    /**
      Display a warning with the provided message. Ember build tools will
      remove any calls to `Ember.warn()` when doing a production build.

      @method warn
      @param {String} message A warning to display.
      @param {Boolean} test An optional boolean. If falsy, the warning
        will be displayed.
    */
    Ember.warn = function(message, test) {
      if (!test) {
        Logger.warn("WARNING: "+message);
        if ('trace' in Logger) Logger.trace();
      }
    };

    /**
      Display a debug notice. Ember build tools will remove any calls to
      `Ember.debug()` when doing a production build.

      ```javascript
      Ember.debug('I\'m a debug notice!');
      ```

      @method debug
      @param {String} message A debug message to display.
    */
    Ember.debug = function(message) {
      Logger.debug("DEBUG: "+message);
    };

    /**
      Display a deprecation warning with the provided message and a stack trace
      (Chrome and Firefox only). Ember build tools will remove any calls to
      `Ember.deprecate()` when doing a production build.

      @method deprecate
      @param {String} message A description of the deprecation.
      @param {Boolean} test An optional boolean. If falsy, the deprecation
        will be displayed.
    */
    Ember.deprecate = function(message, test) {
      if (test) { return; }

      if (Ember.ENV.RAISE_ON_DEPRECATION) { throw new EmberError(message); }

      var error;

      // When using new Error, we can't do the arguments check for Chrome. Alternatives are welcome
      try { __fail__.fail(); } catch (e) { error = e; }

      if (Ember.LOG_STACKTRACE_ON_DEPRECATION && error.stack) {
        var stack;
        var stackStr = '';

        if (error['arguments']) {
          // Chrome
          stack = error.stack.replace(/^\s+at\s+/gm, '').
                              replace(/^([^\(]+?)([\n$])/gm, '{anonymous}($1)$2').
                              replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}($1)').split('\n');
          stack.shift();
        } else {
          // Firefox
          stack = error.stack.replace(/(?:\n@:0)?\s+$/m, '').
                              replace(/^\(/gm, '{anonymous}(').split('\n');
        }

        stackStr = "\n    " + stack.slice(2).join("\n    ");
        message = message + stackStr;
      }

      Logger.warn("DEPRECATION: "+message);
    };



    /**
      Alias an old, deprecated method with its new counterpart.

      Display a deprecation warning with the provided message and a stack trace
      (Chrome and Firefox only) when the assigned method is called.

      Ember build tools will not remove calls to `Ember.deprecateFunc()`, though
      no warnings will be shown in production.

      ```javascript
      Ember.oldMethod = Ember.deprecateFunc('Please use the new, updated method', Ember.newMethod);
      ```

      @method deprecateFunc
      @param {String} message A description of the deprecation.
      @param {Function} func The new function called to replace its deprecated counterpart.
      @return {Function} a new function that wrapped the original function with a deprecation warning
    */
    Ember.deprecateFunc = function(message, func) {
      return function() {
        Ember.deprecate(message);
        return func.apply(this, arguments);
      };
    };


    /**
      Run a function meant for debugging. Ember build tools will remove any calls to
      `Ember.runInDebug()` when doing a production build.

      ```javascript
      Ember.runInDebug(function() {
        Ember.Handlebars.EachView.reopen({
          didInsertElement: function() {
            console.log('I\'m happy');
          }
        });
      });
      ```

      @method runInDebug
      @param {Function} func The function to be executed.
      @since 1.5.0
    */
    Ember.runInDebug = function(func) {
      func();
    };

    /**
      Will call `Ember.warn()` if ENABLE_ALL_FEATURES, ENABLE_OPTIONAL_FEATURES, or
      any specific FEATURES flag is truthy.

      This method is called automatically in debug canary builds.

      @private
      @method _warnIfUsingStrippedFeatureFlags
      @return {void}
    */
    function _warnIfUsingStrippedFeatureFlags(FEATURES, featuresWereStripped) {
      if (featuresWereStripped) {
        Ember.warn('Ember.ENV.ENABLE_ALL_FEATURES is only available in canary builds.', !Ember.ENV.ENABLE_ALL_FEATURES);
        Ember.warn('Ember.ENV.ENABLE_OPTIONAL_FEATURES is only available in canary builds.', !Ember.ENV.ENABLE_OPTIONAL_FEATURES);

        for (var key in FEATURES) {
          if (FEATURES.hasOwnProperty(key) && key !== 'isEnabled') {
            Ember.warn('FEATURE["' + key + '"] is set as enabled, but FEATURE flags are only available in canary builds.', !FEATURES[key]);
          }
        }
      }
    }

    __exports__._warnIfUsingStrippedFeatureFlags = _warnIfUsingStrippedFeatureFlags;if (!Ember.testing) {
      // Complain if they're using FEATURE flags in builds other than canary
      Ember.FEATURES['features-stripped-test'] = true;
      var featuresWereStripped = true;


      delete Ember.FEATURES['features-stripped-test'];
      _warnIfUsingStrippedFeatureFlags(Ember.ENV.FEATURES, featuresWereStripped);

      // Inform the developer about the Ember Inspector if not installed.
      var isFirefox = typeof InstallTrigger !== 'undefined';
      var isChrome = !!window.chrome && !window.opera;

      if (typeof window !== 'undefined' && (isFirefox || isChrome) && window.addEventListener) {
        window.addEventListener("load", function() {
          if (document.documentElement && document.documentElement.dataset && !document.documentElement.dataset.emberExtension) {
            var downloadURL;

            if(isChrome) {
              downloadURL = 'https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi';
            } else if(isFirefox) {
              downloadURL = 'https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/';
            }

            Ember.debug('For more advanced debugging, install the Ember Inspector from ' + downloadURL);
          }
        }, false);
      }
    }
  });
enifed("ember-extension-support",
  ["ember-metal/core","ember-extension-support/data_adapter","ember-extension-support/container_debug_adapter"],
  function(__dependency1__, __dependency2__, __dependency3__) {
    "use strict";
    /**
    Ember Extension Support

    @module ember
    @submodule ember-extension-support
    @requires ember-application
    */

    var Ember = __dependency1__["default"];
    var DataAdapter = __dependency2__["default"];
    var ContainerDebugAdapter = __dependency3__["default"];

    Ember.DataAdapter = DataAdapter;
    Ember.ContainerDebugAdapter = ContainerDebugAdapter;
  });
enifed("ember-extension-support/container_debug_adapter",
  ["ember-metal/core","ember-runtime/system/native_array","ember-metal/utils","ember-runtime/system/string","ember-runtime/system/namespace","ember-runtime/system/object","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var emberA = __dependency2__.A;
    var typeOf = __dependency3__.typeOf;
    var dasherize = __dependency4__.dasherize;
    var classify = __dependency4__.classify;
    var Namespace = __dependency5__["default"];
    var EmberObject = __dependency6__["default"];

    /**
    @module ember
    @submodule ember-extension-support
    */

    /**
      The `ContainerDebugAdapter` helps the container and resolver interface
      with tools that debug Ember such as the
      [Ember Extension](https://github.com/tildeio/ember-extension)
      for Chrome and Firefox.

      This class can be extended by a custom resolver implementer
      to override some of the methods with library-specific code.

      The methods likely to be overridden are:

      * `canCatalogEntriesByType`
      * `catalogEntriesByType`

      The adapter will need to be registered
      in the application's container as `container-debug-adapter:main`

      Example:

      ```javascript
      Application.initializer({
        name: "containerDebugAdapter",

        initialize: function(container, application) {
          application.register('container-debug-adapter:main', require('app/container-debug-adapter'));
        }
      });
      ```

      @class ContainerDebugAdapter
      @namespace Ember
      @extends EmberObject
      @since 1.5.0
    */
    __exports__["default"] = EmberObject.extend({
      /**
        The container of the application being debugged.
        This property will be injected
        on creation.

        @property container
        @default null
      */
      container: null,

      /**
        The resolver instance of the application
        being debugged. This property will be injected
        on creation.

        @property resolver
        @default null
      */
      resolver: null,

      /**
        Returns true if it is possible to catalog a list of available
        classes in the resolver for a given type.

        @method canCatalogEntriesByType
        @param {String} type The type. e.g. "model", "controller", "route"
        @return {boolean} whether a list is available for this type.
      */
      canCatalogEntriesByType: function(type) {
        if (type === 'model' || type === 'template') return false;
        return true;
      },

      /**
        Returns the available classes a given type.

        @method catalogEntriesByType
        @param {String} type The type. e.g. "model", "controller", "route"
        @return {Array} An array of strings.
      */
      catalogEntriesByType: function(type) {
        var namespaces = emberA(Namespace.NAMESPACES), types = emberA();
        var typeSuffixRegex = new RegExp(classify(type) + "$");

        namespaces.forEach(function(namespace) {
          if (namespace !== Ember) {
            for (var key in namespace) {
              if (!namespace.hasOwnProperty(key)) { continue; }
              if (typeSuffixRegex.test(key)) {
                var klass = namespace[key];
                if (typeOf(klass) === 'class') {
                  types.push(dasherize(key.replace(typeSuffixRegex, '')));
                }
              }
            }
          }
        });
        return types;
      }
    });
  });
enifed("ember-extension-support/data_adapter",
  ["ember-metal/core","ember-metal/property_get","ember-metal/run_loop","ember-runtime/system/string","ember-runtime/system/namespace","ember-runtime/system/object","ember-runtime/system/native_array","ember-application/system/application","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var get = __dependency2__.get;
    var run = __dependency3__["default"];
    var dasherize = __dependency4__.dasherize;
    var Namespace = __dependency5__["default"];
    var EmberObject = __dependency6__["default"];
    var emberA = __dependency7__.A;
    var Application = __dependency8__["default"];

    /**
    @module ember
    @submodule ember-extension-support
    */

    /**
      The `DataAdapter` helps a data persistence library
      interface with tools that debug Ember such
      as the [Ember Extension](https://github.com/tildeio/ember-extension)
      for Chrome and Firefox.

      This class will be extended by a persistence library
      which will override some of the methods with
      library-specific code.

      The methods likely to be overridden are:

      * `getFilters`
      * `detect`
      * `columnsForType`
      * `getRecords`
      * `getRecordColumnValues`
      * `getRecordKeywords`
      * `getRecordFilterValues`
      * `getRecordColor`
      * `observeRecord`

      The adapter will need to be registered
      in the application's container as `dataAdapter:main`

      Example:

      ```javascript
      Application.initializer({
        name: "data-adapter",

        initialize: function(container, application) {
          application.register('data-adapter:main', DS.DataAdapter);
        }
      });
      ```

      @class DataAdapter
      @namespace Ember
      @extends EmberObject
    */
    __exports__["default"] = EmberObject.extend({
      init: function() {
        this._super();
        this.releaseMethods = emberA();
      },

      /**
        The container of the application being debugged.
        This property will be injected
        on creation.

        @property container
        @default null
        @since 1.3.0
      */
      container: null,


      /**
        The container-debug-adapter which is used
        to list all models.

        @property containerDebugAdapter
        @default undefined
        @since 1.5.0
      **/
      containerDebugAdapter: undefined,

      /**
        Number of attributes to send
        as columns. (Enough to make the record
        identifiable).

        @private
        @property attributeLimit
        @default 3
        @since 1.3.0
      */
      attributeLimit: 3,

      /**
        Stores all methods that clear observers.
        These methods will be called on destruction.

        @private
        @property releaseMethods
        @since 1.3.0
      */
      releaseMethods: emberA(),

      /**
        Specifies how records can be filtered.
        Records returned will need to have a `filterValues`
        property with a key for every name in the returned array.

        @public
        @method getFilters
        @return {Array} List of objects defining filters.
         The object should have a `name` and `desc` property.
      */
      getFilters: function() {
        return emberA();
      },

      /**
        Fetch the model types and observe them for changes.

        @public
        @method watchModelTypes

        @param {Function} typesAdded Callback to call to add types.
        Takes an array of objects containing wrapped types (returned from `wrapModelType`).

        @param {Function} typesUpdated Callback to call when a type has changed.
        Takes an array of objects containing wrapped types.

        @return {Function} Method to call to remove all observers
      */
      watchModelTypes: function(typesAdded, typesUpdated) {
        var modelTypes = this.getModelTypes();
        var self = this;
        var releaseMethods = emberA();
        var typesToSend;

        typesToSend = modelTypes.map(function(type) {
          var klass = type.klass;
          var wrapped = self.wrapModelType(klass, type.name);
          releaseMethods.push(self.observeModelType(klass, typesUpdated));
          return wrapped;
        });

        typesAdded(typesToSend);

        var release = function() {
          releaseMethods.forEach(function(fn) { fn(); });
          self.releaseMethods.removeObject(release);
        };
        this.releaseMethods.pushObject(release);
        return release;
      },

      _nameToClass: function(type) {
        if (typeof type === 'string') {
          type = this.container.lookupFactory('model:' + type);
        }
        return type;
      },

      /**
        Fetch the records of a given type and observe them for changes.

        @public
        @method watchRecords

        @param {Function} recordsAdded Callback to call to add records.
        Takes an array of objects containing wrapped records.
        The object should have the following properties:
          columnValues: {Object} key and value of a table cell
          object: {Object} the actual record object

        @param {Function} recordsUpdated Callback to call when a record has changed.
        Takes an array of objects containing wrapped records.

        @param {Function} recordsRemoved Callback to call when a record has removed.
        Takes the following parameters:
          index: the array index where the records were removed
          count: the number of records removed

        @return {Function} Method to call to remove all observers
      */
      watchRecords: function(type, recordsAdded, recordsUpdated, recordsRemoved) {
        var self = this, releaseMethods = emberA(), records = this.getRecords(type), release;

        var recordUpdated = function(updatedRecord) {
          recordsUpdated([updatedRecord]);
        };

        var recordsToSend = records.map(function(record) {
          releaseMethods.push(self.observeRecord(record, recordUpdated));
          return self.wrapRecord(record);
        });


        var contentDidChange = function(array, idx, removedCount, addedCount) {
          for (var i = idx; i < idx + addedCount; i++) {
            var record = array.objectAt(i);
            var wrapped = self.wrapRecord(record);
            releaseMethods.push(self.observeRecord(record, recordUpdated));
            recordsAdded([wrapped]);
          }

          if (removedCount) {
            recordsRemoved(idx, removedCount);
          }
        };

        var observer = { didChange: contentDidChange, willChange: Ember.K };
        records.addArrayObserver(self, observer);

        release = function() {
          releaseMethods.forEach(function(fn) { fn(); });
          records.removeArrayObserver(self, observer);
          self.releaseMethods.removeObject(release);
        };

        recordsAdded(recordsToSend);

        this.releaseMethods.pushObject(release);
        return release;
      },

      /**
        Clear all observers before destruction
        @private
        @method willDestroy
      */
      willDestroy: function() {
        this._super();
        this.releaseMethods.forEach(function(fn) {
          fn();
        });
      },

      /**
        Detect whether a class is a model.

        Test that against the model class
        of your persistence library

        @private
        @method detect
        @param {Class} klass The class to test
        @return boolean Whether the class is a model class or not
      */
      detect: function(klass) {
        return false;
      },

      /**
        Get the columns for a given model type.

        @private
        @method columnsForType
        @param {Class} type The model type
        @return {Array} An array of columns of the following format:
         name: {String} name of the column
         desc: {String} Humanized description (what would show in a table column name)
      */
      columnsForType: function(type) {
        return emberA();
      },

      /**
        Adds observers to a model type class.

        @private
        @method observeModelType
        @param {Class} type The model type class
        @param {Function} typesUpdated Called when a type is modified.
        @return {Function} The function to call to remove observers
      */

      observeModelType: function(type, typesUpdated) {
        var self = this;
        var records = this.getRecords(type);

        var onChange = function() {
          typesUpdated([self.wrapModelType(type)]);
        };
        var observer = {
          didChange: function() {
            run.scheduleOnce('actions', this, onChange);
          },
          willChange: Ember.K
        };

        records.addArrayObserver(this, observer);

        var release = function() {
          records.removeArrayObserver(self, observer);
        };

        return release;
      },


      /**
        Wraps a given model type and observes changes to it.

        @private
        @method wrapModelType
        @param {Class} type A model class
        @param {String}  Optional name of the class
        @return {Object} contains the wrapped type and the function to remove observers
        Format:
          type: {Object} the wrapped type
            The wrapped type has the following format:
              name: {String} name of the type
              count: {Integer} number of records available
              columns: {Columns} array of columns to describe the record
              object: {Class} the actual Model type class
          release: {Function} The function to remove observers
      */
      wrapModelType: function(type, name) {
        var records = this.getRecords(type);
        var typeToSend;

        typeToSend = {
          name: name || type.toString(),
          count: get(records, 'length'),
          columns: this.columnsForType(type),
          object: type
        };


        return typeToSend;
      },


      /**
        Fetches all models defined in the application.

        @private
        @method getModelTypes
        @return {Array} Array of model types
      */
      getModelTypes: function() {
        var self = this;
        var containerDebugAdapter = this.get('containerDebugAdapter');
        var types;

        if (containerDebugAdapter.canCatalogEntriesByType('model')) {
          types = containerDebugAdapter.catalogEntriesByType('model');
        } else {
          types = this._getObjectsOnNamespaces();
        }

        // New adapters return strings instead of classes
        types = emberA(types).map(function(name) {
          return {
            klass: self._nameToClass(name),
            name: name
          };
        });
        types = emberA(types).filter(function(type) {
          return self.detect(type.klass);
        });

        return emberA(types);
      },

      /**
        Loops over all namespaces and all objects
        attached to them

        @private
        @method _getObjectsOnNamespaces
        @return {Array} Array of model type strings
      */
      _getObjectsOnNamespaces: function() {
        var namespaces = emberA(Namespace.NAMESPACES);
        var types = emberA();
        var self = this;

        namespaces.forEach(function(namespace) {
          for (var key in namespace) {
            if (!namespace.hasOwnProperty(key)) { continue; }
            // Even though we will filter again in `getModelTypes`,
            // we should not call `lookupContainer` on non-models
            // (especially when `Ember.MODEL_FACTORY_INJECTIONS` is `true`)
            if (!self.detect(namespace[key])) { continue; }
            var name = dasherize(key);
            if (!(namespace instanceof Application) && namespace.toString()) {
              name = namespace + '/' + name;
            }
            types.push(name);
          }
        });
        return types;
      },

      /**
        Fetches all loaded records for a given type.

        @private
        @method getRecords
        @return {Array} An array of records.
         This array will be observed for changes,
         so it should update when new records are added/removed.
      */
      getRecords: function(type) {
        return emberA();
      },

      /**
        Wraps a record and observers changes to it.

        @private
        @method wrapRecord
        @param {Object} record The record instance.
        @return {Object} The wrapped record. Format:
        columnValues: {Array}
        searchKeywords: {Array}
      */
      wrapRecord: function(record) {
        var recordToSend = { object: record };

        recordToSend.columnValues = this.getRecordColumnValues(record);
        recordToSend.searchKeywords = this.getRecordKeywords(record);
        recordToSend.filterValues = this.getRecordFilterValues(record);
        recordToSend.color = this.getRecordColor(record);

        return recordToSend;
      },

      /**
        Gets the values for each column.

        @private
        @method getRecordColumnValues
        @return {Object} Keys should match column names defined
        by the model type.
      */
      getRecordColumnValues: function(record) {
        return {};
      },

      /**
        Returns keywords to match when searching records.

        @private
        @method getRecordKeywords
        @return {Array} Relevant keywords for search.
      */
      getRecordKeywords: function(record) {
        return emberA();
      },

      /**
        Returns the values of filters defined by `getFilters`.

        @private
        @method getRecordFilterValues
        @param {Object} record The record instance
        @return {Object} The filter values
      */
      getRecordFilterValues: function(record) {
        return {};
      },

      /**
        Each record can have a color that represents its state.

        @private
        @method getRecordColor
        @param {Object} record The record instance
        @return {String} The record's color
          Possible options: black, red, blue, green
      */
      getRecordColor: function(record) {
        return null;
      },

      /**
        Observes all relevant properties and re-sends the wrapped record
        when a change occurs.

        @private
        @method observerRecord
        @param {Object} record The record instance
        @param {Function} recordUpdated The callback to call when a record is updated.
        @return {Function} The function to call to remove all observers.
      */
      observeRecord: function(record, recordUpdated) {
        return function(){};
      }
    });
  });
enifed("ember-extension-support/initializers",
  [],
  function() {
    "use strict";

  });
enifed("ember-handlebars-compiler",
  ["ember-metal/core","exports"],
  function(__dependency1__, __exports__) {
        /* global Handlebars:true */

    // Remove "use strict"; from transpiled module (in browser builds only) until
    // https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed
    //
    // REMOVE_USE_STRICT: true

    /**
    @module ember
    @submodule ember-handlebars-compiler
    */

    var Ember = __dependency1__["default"];

    // ES6Todo: you'll need to import debugger once debugger is es6'd.
    if (typeof Ember.assert === 'undefined')   { Ember.assert = function(){}; }
    if (typeof Ember.FEATURES === 'undefined') { Ember.FEATURES = { isEnabled: function(){} }; }

    var objectCreate = Object.create || function(parent) {
      function F() {}
      F.prototype = parent;
      return new F();
    };

    // set up for circular references later
    var View, Component;

    // ES6Todo: when ember-debug is es6'ed import this.
    // var emberAssert = Ember.assert;
    var Handlebars = (Ember.imports && Ember.imports.Handlebars) || (this && this.Handlebars);
    if (!Handlebars && typeof eriuqer === 'function') {
      Handlebars = eriuqer('handlebars');
    }

    Ember.assert("Ember Handlebars requires Handlebars version 2.0. Include " +
                 "a SCRIPT tag in the HTML HEAD linking to the Handlebars file " +
                 "before you link to Ember.", Handlebars);

    Ember.assert("Ember Handlebars requires Handlebars version 2.0. " +
                 "Please see more details at http://emberjs.com/blog/2014/10/16/handlebars-update.html.",
                 Handlebars.COMPILER_REVISION === 6);

    /**
      Prepares the Handlebars templating library for use inside Ember's view
      system.

      The `Ember.Handlebars` object is the standard Handlebars library, extended to
      use Ember's `get()` method instead of direct property access, which allows
      computed properties to be used inside templates.

      To create an `Ember.Handlebars` template, call `Ember.Handlebars.compile()`.
      This will return a function that can be used by `Ember.View` for rendering.

      @class Handlebars
      @namespace Ember
    */
    var EmberHandlebars = Ember.Handlebars = Handlebars.create();

    /**
      Register a bound helper or custom view helper.

      ## Simple bound helper example

      ```javascript
      Ember.Handlebars.helper('capitalize', function(value) {
        return value.toUpperCase();
      });
      ```

      The above bound helper can be used inside of templates as follows:

      ```handlebars
      {{capitalize name}}
      ```

      In this case, when the `name` property of the template's context changes,
      the rendered value of the helper will update to reflect this change.

      For more examples of bound helpers, see documentation for
      `Ember.Handlebars.registerBoundHelper`.

      ## Custom view helper example

      Assuming a view subclass named `App.CalendarView` were defined, a helper
      for rendering instances of this view could be registered as follows:

      ```javascript
      Ember.Handlebars.helper('calendar', App.CalendarView):
      ```

      The above bound helper can be used inside of templates as follows:

      ```handlebars
      {{calendar}}
      ```

      Which is functionally equivalent to:

      ```handlebars
      {{view 'calendar'}}
      ```

      Options in the helper will be passed to the view in exactly the same
      manner as with the `view` helper.

      @method helper
      @for Ember.Handlebars
      @param {String} name
      @param {Function|Ember.View} function or view class constructor
      @param {String} dependentKeys*
    */
    EmberHandlebars.helper = function(name, value) {
      if (!View) { View = requireModule('ember-views/views/view')['default']; } // ES6TODO: stupid circular dep
      if (!Component) { Component = requireModule('ember-views/views/component')['default']; } // ES6TODO: stupid circular dep

      Ember.assert("You tried to register a component named '" + name +
                   "', but component names must include a '-'", !Component.detect(value) || name.match(/-/));

      if (View.detect(value)) {
        EmberHandlebars.registerHelper(name, EmberHandlebars.makeViewHelper(value));
      } else {
        EmberHandlebars.registerBoundHelper.apply(null, arguments);
      }
    };

    /**
      Returns a helper function that renders the provided ViewClass.

      Used internally by Ember.Handlebars.helper and other methods
      involving helper/component registration.

      @private
      @method makeViewHelper
      @for Ember.Handlebars
      @param {Function} ViewClass view class constructor
      @since 1.2.0
    */
    EmberHandlebars.makeViewHelper = function(ViewClass) {
      return function(options) {
        Ember.assert("You can only pass attributes (such as name=value) not bare " +
                     "values to a helper for a View found in '" + ViewClass.toString() + "'", arguments.length < 2);
        return EmberHandlebars.helpers.view.call(this, ViewClass, options);
      };
    };

    /**
    @class helpers
    @namespace Ember.Handlebars
    */
    EmberHandlebars.helpers = objectCreate(Handlebars.helpers);

    /**
      Override the the opcode compiler and JavaScript compiler for Handlebars.

      @class Compiler
      @namespace Ember.Handlebars
      @private
      @constructor
    */
    EmberHandlebars.Compiler = function() {};

    // Handlebars.Compiler doesn't exist in runtime-only
    if (Handlebars.Compiler) {
      EmberHandlebars.Compiler.prototype = objectCreate(Handlebars.Compiler.prototype);
    }

    EmberHandlebars.Compiler.prototype.compiler = EmberHandlebars.Compiler;

    /**
      @class JavaScriptCompiler
      @namespace Ember.Handlebars
      @private
      @constructor
    */
    EmberHandlebars.JavaScriptCompiler = function() {};

    // Handlebars.JavaScriptCompiler doesn't exist in runtime-only
    if (Handlebars.JavaScriptCompiler) {
      EmberHandlebars.JavaScriptCompiler.prototype = objectCreate(Handlebars.JavaScriptCompiler.prototype);
      EmberHandlebars.JavaScriptCompiler.prototype.compiler = EmberHandlebars.JavaScriptCompiler;
    }


    EmberHandlebars.JavaScriptCompiler.prototype.namespace = "Ember.Handlebars";

    EmberHandlebars.JavaScriptCompiler.prototype.initializeBuffer = function() {
      return "''";
    };

    /**
      Override the default buffer for Ember Handlebars. By default, Handlebars
      creates an empty String at the beginning of each invocation and appends to
      it. Ember's Handlebars overrides this to append to a single shared buffer.

      @private
      @method appendToBuffer
      @param string {String}
    */
    EmberHandlebars.JavaScriptCompiler.prototype.appendToBuffer = function(string) {
      return "data.buffer.push("+string+");";
    };

    /**
      Rewrite simple mustaches from `{{foo}}` to `{{bind "foo"}}`. This means that
      all simple mustaches in Ember's Handlebars will also set up an observer to
      keep the DOM up to date when the underlying property changes.

      @private
      @method mustache
      @for Ember.Handlebars.Compiler
      @param mustache
    */
    EmberHandlebars.Compiler.prototype.mustache = function(mustache) {
      if (!(mustache.params.length || mustache.hash)) {
        var id = new Handlebars.AST.IdNode([{ part: '_triageMustache' }]);

        // Update the mustache node to include a hash value indicating whether the original node
        // was escaped. This will allow us to properly escape values when the underlying value
        // changes and we need to re-render the value.
        if (!mustache.escaped) {
          mustache.hash = mustache.hash || new Handlebars.AST.HashNode([]);
          mustache.hash.pairs.push(["unescaped", new Handlebars.AST.StringNode("true")]);
        }
        mustache = new Handlebars.AST.MustacheNode([id].concat([mustache.id]), mustache.hash, !mustache.escaped);
      }

      return Handlebars.Compiler.prototype.mustache.call(this, mustache);
    };

    /**
      Used for precompilation of Ember Handlebars templates. This will not be used
      during normal app execution.

      @method precompile
      @for Ember.Handlebars
      @static
      @param {String|Object} value The template to precompile or an Handlebars AST
      @param {Boolean} asObject optional parameter, defaulting to true, of whether or not the
                                compiled template should be returned as an Object or a String
    */
    EmberHandlebars.precompile = function(value, asObject) {
      var ast = Handlebars.parse(value);

      var options = {
        knownHelpers: {
          action: true,
          unbound: true,
          'bind-attr': true,
          template: true,
          view: true,
          _triageMustache: true
        },
        data: true,
        stringParams: true
      };

      asObject = asObject === undefined ? true : asObject;

      var environment = new EmberHandlebars.Compiler().compile(ast, options);
      return new EmberHandlebars.JavaScriptCompiler().compile(environment, options, undefined, asObject);
    };

    // We don't support this for Handlebars runtime-only
    if (Handlebars.compile) {
      /**
        The entry point for Ember Handlebars. This replaces the default
        `Handlebars.compile` and turns on template-local data and String
        parameters.

        @method compile
        @for Ember.Handlebars
        @static
        @param {String} string The template to compile
        @return {Function}
      */
      EmberHandlebars.compile = function(string) {
        var ast = Handlebars.parse(string);
        var options = { data: true, stringParams: true };
        var environment = new EmberHandlebars.Compiler().compile(ast, options);
        var templateSpec = new EmberHandlebars.JavaScriptCompiler().compile(environment, options, undefined, true);

        var template = EmberHandlebars.template(templateSpec);
        template.isMethod = false; //Make sure we don't wrap templates with ._super

        return template;
      };
    }

    __exports__["default"] = EmberHandlebars;
  });
enifed("ember-handlebars",
  ["ember-handlebars-compiler","ember-metal/core","ember-runtime/system/lazy_load","ember-handlebars/loader","ember-handlebars/ext","ember-handlebars/string","ember-handlebars/helpers/binding","ember-handlebars/helpers/if_unless","ember-handlebars/helpers/with","ember-handlebars/helpers/bind_attr","ember-handlebars/helpers/collection","ember-handlebars/helpers/view","ember-handlebars/helpers/unbound","ember-handlebars/helpers/debug","ember-handlebars/helpers/each","ember-handlebars/helpers/template","ember-handlebars/helpers/partial","ember-handlebars/helpers/yield","ember-handlebars/helpers/loc","ember-handlebars/controls/checkbox","ember-handlebars/controls/select","ember-handlebars/controls/text_area","ember-handlebars/controls/text_field","ember-handlebars/controls/text_support","ember-handlebars/controls","ember-handlebars/component_lookup","ember-handlebars/views/handlebars_bound_view","ember-handlebars/views/metamorph_view","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __dependency10__, __dependency11__, __dependency12__, __dependency13__, __dependency14__, __dependency15__, __dependency16__, __dependency17__, __dependency18__, __dependency19__, __dependency20__, __dependency21__, __dependency22__, __dependency23__, __dependency24__, __dependency25__, __dependency26__, __dependency27__, __dependency28__, __exports__) {
    "use strict";
    var EmberHandlebars = __dependency1__["default"];
    var Ember = __dependency2__["default"];
    // to add to globals

    var runLoadHooks = __dependency3__.runLoadHooks;
    var bootstrap = __dependency4__["default"];

    var makeBoundHelper = __dependency5__.makeBoundHelper;
    var registerBoundHelper = __dependency5__.registerBoundHelper;
    var helperMissingHelper = __dependency5__.helperMissingHelper;
    var blockHelperMissingHelper = __dependency5__.blockHelperMissingHelper;
    var handlebarsGet = __dependency5__.handlebarsGet;


    // side effect of extending StringUtils of htmlSafe

    var bind = __dependency7__.bind;
    var _triageMustacheHelper = __dependency7__._triageMustacheHelper;
    var resolveHelper = __dependency7__.resolveHelper;
    var bindHelper = __dependency7__.bindHelper;

    var ifHelper = __dependency8__.ifHelper;
    var boundIfHelper = __dependency8__.boundIfHelper;
    var unboundIfHelper = __dependency8__.unboundIfHelper;
    var unlessHelper = __dependency8__.unlessHelper;

    var withHelper = __dependency9__["default"];

    var bindAttrHelper = __dependency10__.bindAttrHelper;
    var bindAttrHelperDeprecated = __dependency10__.bindAttrHelperDeprecated;
    var bindClasses = __dependency10__.bindClasses;

    var collectionHelper = __dependency11__["default"];
    var ViewHelper = __dependency12__.ViewHelper;
    var viewHelper = __dependency12__.viewHelper;
    var unboundHelper = __dependency13__["default"];
    var logHelper = __dependency14__.logHelper;
    var debuggerHelper = __dependency14__.debuggerHelper;
    var EachView = __dependency15__.EachView;
    var eachHelper = __dependency15__.eachHelper;
    var templateHelper = __dependency16__["default"];
    var partialHelper = __dependency17__["default"];
    var yieldHelper = __dependency18__["default"];
    var locHelper = __dependency19__["default"];


    var Checkbox = __dependency20__["default"];
    var Select = __dependency21__.Select;
    var SelectOption = __dependency21__.SelectOption;
    var SelectOptgroup = __dependency21__.SelectOptgroup;
    var TextArea = __dependency22__["default"];
    var TextField = __dependency23__["default"];
    var TextSupport = __dependency24__["default"];
    var inputHelper = __dependency25__.inputHelper;
    var textareaHelper = __dependency25__.textareaHelper;

    var ComponentLookup = __dependency26__["default"];
    var _HandlebarsBoundView = __dependency27__._HandlebarsBoundView;
    var SimpleHandlebarsView = __dependency27__.SimpleHandlebarsView;
    var _MetamorphView = __dependency28__["default"];
    var _SimpleMetamorphView = __dependency28__._SimpleMetamorphView;
    var _Metamorph = __dependency28__._Metamorph;


    /**
    Ember Handlebars

    @module ember
    @submodule ember-handlebars
    @requires ember-views
    */

    // Ember.Handlebars.Globals
    EmberHandlebars.bootstrap = bootstrap;
    EmberHandlebars.makeBoundHelper = makeBoundHelper;
    EmberHandlebars.registerBoundHelper = registerBoundHelper;
    EmberHandlebars.resolveHelper = resolveHelper;
    EmberHandlebars.bind = bind;
    EmberHandlebars.bindClasses = bindClasses;
    EmberHandlebars.EachView = EachView;
    EmberHandlebars.ViewHelper = ViewHelper;


    // Ember Globals
    Ember.Handlebars = EmberHandlebars;
    EmberHandlebars.get = handlebarsGet;
    Ember.ComponentLookup = ComponentLookup;
    Ember._SimpleHandlebarsView = SimpleHandlebarsView;
    Ember._HandlebarsBoundView = _HandlebarsBoundView;
    Ember._SimpleMetamorphView = _SimpleMetamorphView;
    Ember._MetamorphView = _MetamorphView;
    Ember._Metamorph = _Metamorph;
    Ember.TextSupport = TextSupport;
    Ember.Checkbox = Checkbox;
    Ember.Select = Select;
    Ember.SelectOption = SelectOption;
    Ember.SelectOptgroup = SelectOptgroup;
    Ember.TextArea = TextArea;
    Ember.TextField = TextField;
    Ember.TextSupport = TextSupport;

    // register helpers
    EmberHandlebars.registerHelper('helperMissing', helperMissingHelper);
    EmberHandlebars.registerHelper('blockHelperMissing', blockHelperMissingHelper);
    EmberHandlebars.registerHelper('bind', bindHelper);
    EmberHandlebars.registerHelper('boundIf', boundIfHelper);
    EmberHandlebars.registerHelper('_triageMustache', _triageMustacheHelper);
    EmberHandlebars.registerHelper('unboundIf', unboundIfHelper);
    EmberHandlebars.registerHelper('with', withHelper);
    EmberHandlebars.registerHelper('if', ifHelper);
    EmberHandlebars.registerHelper('unless', unlessHelper);
    EmberHandlebars.registerHelper('bind-attr', bindAttrHelper);
    EmberHandlebars.registerHelper('bindAttr', bindAttrHelperDeprecated);
    EmberHandlebars.registerHelper('collection', collectionHelper);
    EmberHandlebars.registerHelper("log", logHelper);
    EmberHandlebars.registerHelper("debugger", debuggerHelper);
    EmberHandlebars.registerHelper("each", eachHelper);
    EmberHandlebars.registerHelper("loc", locHelper);
    EmberHandlebars.registerHelper("partial", partialHelper);
    EmberHandlebars.registerHelper("template", templateHelper);
    EmberHandlebars.registerHelper("yield", yieldHelper);
    EmberHandlebars.registerHelper("view", viewHelper);
    EmberHandlebars.registerHelper("unbound", unboundHelper);
    EmberHandlebars.registerHelper("input", inputHelper);
    EmberHandlebars.registerHelper("textarea", textareaHelper);

    // run load hooks
    runLoadHooks('Ember.Handlebars', EmberHandlebars);

    __exports__["default"] = EmberHandlebars;
  });
enifed("ember-handlebars/component_lookup",
  ["ember-runtime/system/object","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var EmberObject = __dependency1__["default"];

    __exports__["default"] = EmberObject.extend({
      lookupFactory: function(name, container) {

        container = container || this.container;

        var fullName = 'component:' + name;
        var templateFullName = 'template:components/' + name;
        var templateRegistered = container && container.has(templateFullName);

        if (templateRegistered) {
          container.injection(fullName, 'layout', templateFullName);
        }

        var Component = container.lookupFactory(fullName);

        // Only treat as a component if either the component
        // or a template has been registered.
        if (templateRegistered || Component) {
          if (!Component) {
            container.register(fullName, Ember.Component);
            Component = container.lookupFactory(fullName);
          }
          return Component;
        }
      }
    });
  });
enifed("ember-handlebars/controls",
  ["ember-handlebars/controls/checkbox","ember-handlebars/controls/text_field","ember-handlebars/controls/text_area","ember-metal/core","ember-handlebars-compiler","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var Checkbox = __dependency1__["default"];
    var TextField = __dependency2__["default"];
    var TextArea = __dependency3__["default"];

    var Ember = __dependency4__["default"];
    // Ember.assert
    // var emberAssert = Ember.assert;

    var EmberHandlebars = __dependency5__["default"];

    /**
    @module ember
    @submodule ember-handlebars-compiler
    */

    /**

      The `{{input}}` helper inserts an HTML `<input>` tag into the template,
      with a `type` value of either `text` or `checkbox`. If no `type` is provided,
      `text` will be the default value applied. The attributes of `{{input}}`
      match those of the native HTML tag as closely as possible for these two types.

      ## Use as text field
      An `{{input}}` with no `type` or a `type` of `text` will render an HTML text input.
      The following HTML attributes can be set via the helper:

     <table>
      <tr><td>`readonly`</td><td>`required`</td><td>`autofocus`</td></tr>
      <tr><td>`value`</td><td>`placeholder`</td><td>`disabled`</td></tr>
      <tr><td>`size`</td><td>`tabindex`</td><td>`maxlength`</td></tr>
      <tr><td>`name`</td><td>`min`</td><td>`max`</td></tr>
      <tr><td>`pattern`</td><td>`accept`</td><td>`autocomplete`</td></tr>
      <tr><td>`autosave`</td><td>`formaction`</td><td>`formenctype`</td></tr>
      <tr><td>`formmethod`</td><td>`formnovalidate`</td><td>`formtarget`</td></tr>
      <tr><td>`height`</td><td>`inputmode`</td><td>`multiple`</td></tr>
      <tr><td>`step`</td><td>`width`</td><td>`form`</td></tr>
      <tr><td>`selectionDirection`</td><td>`spellcheck`</td><td>&nbsp;</td></tr>
     </table>


      When set to a quoted string, these values will be directly applied to the HTML
      element. When left unquoted, these values will be bound to a property on the
      template's current rendering context (most typically a controller instance).

      ## Unbound:

      ```handlebars
      {{input value="http://www.facebook.com"}}
      ```


      ```html
      <input type="text" value="http://www.facebook.com"/>
      ```

      ## Bound:

      ```javascript
      App.ApplicationController = Ember.Controller.extend({
        firstName: "Stanley",
        entryNotAllowed: true
      });
      ```


      ```handlebars
      {{input type="text" value=firstName disabled=entryNotAllowed size="50"}}
      ```


      ```html
      <input type="text" value="Stanley" disabled="disabled" size="50"/>
      ```

      ## Actions

      The helper can send multiple actions based on user events.

      The action property defines the action which is sent when
      the user presses the return key.


      ```handlebars
      {{input action="submit"}}
      ```


      The helper allows some user events to send actions.

    * `enter`
    * `insert-newline`
    * `escape-press`
    * `focus-in`
    * `focus-out`
    * `key-press`


      For example, if you desire an action to be sent when the input is blurred,
      you only need to setup the action name to the event name property.


      ```handlebars
      {{input focus-in="alertMessage"}}
      ```


      See more about [Text Support Actions](/api/classes/Ember.TextField.html)

      ## Extension

      Internally, `{{input type="text"}}` creates an instance of `Ember.TextField`, passing
      arguments from the helper to `Ember.TextField`'s `create` method. You can extend the
      capabilities of text inputs in your applications by reopening this class. For example,
      if you are building a Bootstrap project where `data-*` attributes are used, you
      can add one to the `TextField`'s `attributeBindings` property:


      ```javascript
      Ember.TextField.reopen({
        attributeBindings: ['data-error']
      });
      ```

      Keep in mind when writing `Ember.TextField` subclasses that `Ember.TextField`
      itself extends `Ember.Component`, meaning that it does NOT inherit
      the `controller` of the parent view.

      See more about [Ember components](/api/classes/Ember.Component.html)


      ## Use as checkbox

      An `{{input}}` with a `type` of `checkbox` will render an HTML checkbox input.
      The following HTML attributes can be set via the helper:

    * `checked`
    * `disabled`
    * `tabindex`
    * `indeterminate`
    * `name`
    * `autofocus`
    * `form`


      When set to a quoted string, these values will be directly applied to the HTML
      element. When left unquoted, these values will be bound to a property on the
      template's current rendering context (most typically a controller instance).

      ## Unbound:

      ```handlebars
      {{input type="checkbox" name="isAdmin"}}
      ```

      ```html
      <input type="checkbox" name="isAdmin" />
      ```

      ## Bound:

      ```javascript
      App.ApplicationController = Ember.Controller.extend({
        isAdmin: true
      });
      ```


      ```handlebars
      {{input type="checkbox" checked=isAdmin }}
      ```


      ```html
      <input type="checkbox" checked="checked" />
      ```

      ## Extension

      Internally, `{{input type="checkbox"}}` creates an instance of `Ember.Checkbox`, passing
      arguments from the helper to `Ember.Checkbox`'s `create` method. You can extend the
      capablilties of checkbox inputs in your applications by reopening this class. For example,
      if you wanted to add a css class to all checkboxes in your application:


      ```javascript
      Ember.Checkbox.reopen({
        classNames: ['my-app-checkbox']
      });
      ```


      @method input
      @for Ember.Handlebars.helpers
      @param {Hash} options
    */
    function inputHelper(options) {
      Ember.assert('You can only pass attributes to the `input` helper, not arguments', arguments.length < 2);

      var view = options.data.view;
      var hash = options.hash;
      var types = options.hashTypes;
      var onEvent = hash.on;
      var inputType;

      if (types.type === 'ID') {
        inputType = view.getStream(hash.type).value();
      } else {
        inputType = hash.type;
      }

      if (inputType === 'checkbox') {
        delete hash.type;
        delete types.type;

        Ember.assert("{{input type='checkbox'}} does not support setting `value=someBooleanValue`;" +
                     " you must use `checked=someBooleanValue` instead.", options.hashTypes.value !== 'ID');

        return EmberHandlebars.helpers.view.call(this, Checkbox, options);
      } else {
        delete hash.on;

        hash.onEvent = onEvent || 'enter';
        return EmberHandlebars.helpers.view.call(this, TextField, options);
      }
    }

    __exports__.inputHelper = inputHelper;/**
      `{{textarea}}` inserts a new instance of `<textarea>` tag into the template.
      The attributes of `{{textarea}}` match those of the native HTML tags as
      closely as possible.

      The following HTML attributes can be set:

        * `value`
        * `name`
        * `rows`
        * `cols`
        * `placeholder`
        * `disabled`
        * `maxlength`
        * `tabindex`
        * `selectionEnd`
        * `selectionStart`
        * `selectionDirection`
        * `wrap`
        * `readonly`
        * `autofocus`
        * `form`
        * `spellcheck`
        * `required`

      When set to a quoted string, these value will be directly applied to the HTML
      element. When left unquoted, these values will be bound to a property on the
      template's current rendering context (most typically a controller instance).

      Unbound:

      ```handlebars
      {{textarea value="Lots of static text that ISN'T bound"}}
      ```

      Would result in the following HTML:

      ```html
      <textarea class="ember-text-area">
        Lots of static text that ISN'T bound
      </textarea>
      ```

      Bound:

      In the following example, the `writtenWords` property on `App.ApplicationController`
      will be updated live as the user types 'Lots of text that IS bound' into
      the text area of their browser's window.

      ```javascript
      App.ApplicationController = Ember.Controller.extend({
        writtenWords: "Lots of text that IS bound"
      });
      ```

      ```handlebars
      {{textarea value=writtenWords}}
      ```

       Would result in the following HTML:

      ```html
      <textarea class="ember-text-area">
        Lots of text that IS bound
      </textarea>
      ```

      If you wanted a one way binding between the text area and a div tag
      somewhere else on your screen, you could use `Ember.computed.oneWay`:

      ```javascript
      App.ApplicationController = Ember.Controller.extend({
        writtenWords: "Lots of text that IS bound",
        outputWrittenWords: Ember.computed.oneWay("writtenWords")
      });
      ```

      ```handlebars
      {{textarea value=writtenWords}}

      <div>
        {{outputWrittenWords}}
      </div>
      ```

      Would result in the following HTML:

      ```html
      <textarea class="ember-text-area">
        Lots of text that IS bound
      </textarea>

      <-- the following div will be updated in real time as you type -->

      <div>
        Lots of text that IS bound
      </div>
      ```

      Finally, this example really shows the power and ease of Ember when two
      properties are bound to eachother via `Ember.computed.alias`. Type into
      either text area box and they'll both stay in sync. Note that
      `Ember.computed.alias` costs more in terms of performance, so only use it when
      your really binding in both directions:

      ```javascript
      App.ApplicationController = Ember.Controller.extend({
        writtenWords: "Lots of text that IS bound",
        twoWayWrittenWords: Ember.computed.alias("writtenWords")
      });
      ```

      ```handlebars
      {{textarea value=writtenWords}}
      {{textarea value=twoWayWrittenWords}}
      ```

      ```html
      <textarea id="ember1" class="ember-text-area">
        Lots of text that IS bound
      </textarea>

      <-- both updated in real time -->

      <textarea id="ember2" class="ember-text-area">
        Lots of text that IS bound
      </textarea>
      ```

      ## Actions

      The helper can send multiple actions based on user events.

      The action property defines the action which is send when
      the user presses the return key.

      ```handlebars
      {{input action="submit"}}
      ```

      The helper allows some user events to send actions.

    * `enter`
    * `insert-newline`
    * `escape-press`
    * `focus-in`
    * `focus-out`
    * `key-press`

      For example, if you desire an action to be sent when the input is blurred,
      you only need to setup the action name to the event name property.

      ```handlebars
      {{textarea focus-in="alertMessage"}}
      ```

      See more about [Text Support Actions](/api/classes/Ember.TextArea.html)

      ## Extension

      Internally, `{{textarea}}` creates an instance of `Ember.TextArea`, passing
      arguments from the helper to `Ember.TextArea`'s `create` method. You can
      extend the capabilities of text areas in your application by reopening this
      class. For example, if you are building a Bootstrap project where `data-*`
      attributes are used, you can globally add support for a `data-*` attribute
      on all `{{textarea}}`s' in your app by reopening `Ember.TextArea` or
      `Ember.TextSupport` and adding it to the `attributeBindings` concatenated
      property:

      ```javascript
      Ember.TextArea.reopen({
        attributeBindings: ['data-error']
      });
      ```

      Keep in mind when writing `Ember.TextArea` subclasses that `Ember.TextArea`
      itself extends `Ember.Component`, meaning that it does NOT inherit
      the `controller` of the parent view.

      See more about [Ember components](/api/classes/Ember.Component.html)

      @method textarea
      @for Ember.Handlebars.helpers
      @param {Hash} options
    */
    function textareaHelper(options) {
      Ember.assert('You can only pass attributes to the `textarea` helper, not arguments', arguments.length < 2);

      return EmberHandlebars.helpers.view.call(this, TextArea, options);
    }

    __exports__.textareaHelper = textareaHelper;
  });
enifed("ember-handlebars/controls/checkbox",
  ["ember-metal/property_get","ember-metal/property_set","ember-views/views/view","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var get = __dependency1__.get;
    var set = __dependency2__.set;
    var View = __dependency3__["default"];

    /**
    @module ember
    @submodule ember-handlebars
    */

    /**
      The internal class used to create text inputs when the `{{input}}`
      helper is used with `type` of `checkbox`.

      See [handlebars.helpers.input](/api/classes/Ember.Handlebars.helpers.html#method_input)  for usage details.

      ## Direct manipulation of `checked`

      The `checked` attribute of an `Ember.Checkbox` object should always be set
      through the Ember object or by interacting with its rendered element
      representation via the mouse, keyboard, or touch. Updating the value of the
      checkbox via jQuery will result in the checked value of the object and its
      element losing synchronization.

      ## Layout and LayoutName properties

      Because HTML `input` elements are self closing `layout` and `layoutName`
      properties will not be applied. See [Ember.View](/api/classes/Ember.View.html)'s
      layout section for more information.

      @class Checkbox
      @namespace Ember
      @extends Ember.View
    */
    __exports__["default"] = View.extend({
      instrumentDisplay: '{{input type="checkbox"}}',

      classNames: ['ember-checkbox'],

      tagName: 'input',

      attributeBindings: [
        'type',
        'checked',
        'indeterminate',
        'disabled',
        'tabindex',
        'name',
        'autofocus',
        'required',
        'form'
      ],

      type: 'checkbox',
      checked: false,
      disabled: false,
      indeterminate: false,

      init: function() {
        this._super();
        this.on('change', this, this._updateElementValue);
      },

      didInsertElement: function() {
        this._super();
        get(this, 'element').indeterminate = !!get(this, 'indeterminate');
      },

      _updateElementValue: function() {
        set(this, 'checked', this.$().prop('checked'));
      }
    });
  });
enifed("ember-handlebars/controls/select",
  ["ember-handlebars-compiler","ember-metal/enumerable_utils","ember-metal/property_get","ember-metal/property_set","ember-views/views/view","ember-views/views/collection_view","ember-metal/utils","ember-metal/is_none","ember-metal/computed","ember-runtime/system/native_array","ember-metal/mixin","ember-metal/properties","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __dependency10__, __dependency11__, __dependency12__, __exports__) {
    "use strict";
    /**
    @module ember
    @submodule ember-handlebars
    */

    var EmberHandlebars = __dependency1__["default"];

    var forEach = __dependency2__.forEach;
    var indexOf = __dependency2__.indexOf;
    var indexesOf = __dependency2__.indexesOf;
    var replace = __dependency2__.replace;

    var get = __dependency3__.get;
    var set = __dependency4__.set;
    var View = __dependency5__["default"];
    var CollectionView = __dependency6__["default"];
    var isArray = __dependency7__.isArray;
    var isNone = __dependency8__["default"];
    var computed = __dependency9__.computed;
    var emberA = __dependency10__.A;
    var observer = __dependency11__.observer;
    var defineProperty = __dependency12__.defineProperty;


    var SelectOption = View.extend({
      instrumentDisplay: 'Ember.SelectOption',

      tagName: 'option',
      attributeBindings: ['value', 'selected'],

      defaultTemplate: function(context, options) {
        options = { data: options.data, hash: {} };
        EmberHandlebars.helpers.bind.call(context, "view.label", options);
      },

      init: function() {
        this.labelPathDidChange();
        this.valuePathDidChange();

        this._super();
      },

      selected: computed(function() {
        var content = get(this, 'content');
        var selection = get(this, 'parentView.selection');
        if (get(this, 'parentView.multiple')) {
          return selection && indexOf(selection, content.valueOf()) > -1;
        } else {
          // Primitives get passed through bindings as objects... since
          // `new Number(4) !== 4`, we use `==` below
          return content == selection; // jshint ignore:line
        }
      }).property('content', 'parentView.selection'),

      labelPathDidChange: observer('parentView.optionLabelPath', function() {
        var labelPath = get(this, 'parentView.optionLabelPath');

        if (!labelPath) { return; }

        defineProperty(this, 'label', computed(function() {
          return get(this, labelPath);
        }).property(labelPath));
      }),

      valuePathDidChange: observer('parentView.optionValuePath', function() {
        var valuePath = get(this, 'parentView.optionValuePath');

        if (!valuePath) { return; }

        defineProperty(this, 'value', computed(function() {
          return get(this, valuePath);
        }).property(valuePath));
      })
    });

    var SelectOptgroup = CollectionView.extend({
      instrumentDisplay: 'Ember.SelectOptgroup',

      tagName: 'optgroup',
      attributeBindings: ['label'],

      selectionBinding: 'parentView.selection',
      multipleBinding: 'parentView.multiple',
      optionLabelPathBinding: 'parentView.optionLabelPath',
      optionValuePathBinding: 'parentView.optionValuePath',

      itemViewClassBinding: 'parentView.optionView'
    });

    /**
      The `Ember.Select` view class renders a
      [select](https://developer.mozilla.org/en/HTML/Element/select) HTML element,
      allowing the user to choose from a list of options.

      The text and `value` property of each `<option>` element within the
      `<select>` element are populated from the objects in the `Element.Select`'s
      `content` property. The underlying data object of the selected `<option>` is
      stored in the `Element.Select`'s `value` property.

      ## The Content Property (array of strings)

      The simplest version of an `Ember.Select` takes an array of strings as its
      `content` property. The string will be used as both the `value` property and
      the inner text of each `<option>` element inside the rendered `<select>`.

      Example:

      ```javascript
      App.ApplicationController = Ember.ObjectController.extend({
        names: ["Yehuda", "Tom"]
      });
      ```

      ```handlebars
      {{view "select" content=names}}
      ```

      Would result in the following HTML:

      ```html
      <select class="ember-select">
        <option value="Yehuda">Yehuda</option>
        <option value="Tom">Tom</option>
      </select>
      ```

      You can control which `<option>` is selected through the `Ember.Select`'s
      `value` property:

      ```javascript
      App.ApplicationController = Ember.ObjectController.extend({
        selectedName: 'Tom',
        names: ["Yehuda", "Tom"]
      });
      ```

      ```handlebars
      {{view "select" content=names value=selectedName}}
      ```

      Would result in the following HTML with the `<option>` for 'Tom' selected:

      ```html
      <select class="ember-select">
        <option value="Yehuda">Yehuda</option>
        <option value="Tom" selected="selected">Tom</option>
      </select>
      ```

      A user interacting with the rendered `<select>` to choose "Yehuda" would
      update the value of `selectedName` to "Yehuda".

      ## The Content Property (array of Objects)

      An `Ember.Select` can also take an array of JavaScript or Ember objects as
      its `content` property.

      When using objects you need to tell the `Ember.Select` which property should
      be accessed on each object to supply the `value` attribute of the `<option>`
      and which property should be used to supply the element text.

      The `optionValuePath` option is used to specify the path on each object to
      the desired property for the `value` attribute. The `optionLabelPath`
      specifies the path on each object to the desired property for the
      element's text. Both paths must reference each object itself as `content`:

      ```javascript
      App.ApplicationController = Ember.ObjectController.extend({
        programmers: [
          {firstName: "Yehuda", id: 1},
          {firstName: "Tom",    id: 2}
        ]
      });
      ```

      ```handlebars
      {{view "select"
             content=programmers
             optionValuePath="content.id"
             optionLabelPath="content.firstName"}}
      ```

      Would result in the following HTML:

      ```html
      <select class="ember-select">
        <option value="1">Yehuda</option>
        <option value="2">Tom</option>
      </select>
      ```

      The `value` attribute of the selected `<option>` within an `Ember.Select`
      can be bound to a property on another object:

      ```javascript
      App.ApplicationController = Ember.ObjectController.extend({
        programmers: [
          {firstName: "Yehuda", id: 1},
          {firstName: "Tom",    id: 2}
        ],
        currentProgrammer: {
          id: 2
        }
      });
      ```

      ```handlebars
      {{view "select"
             content=programmers
             optionValuePath="content.id"
             optionLabelPath="content.firstName"
             value=currentProgrammer.id}}
      ```

      Would result in the following HTML with a selected option:

      ```html
      <select class="ember-select">
        <option value="1">Yehuda</option>
        <option value="2" selected="selected">Tom</option>
      </select>
      ```

      Interacting with the rendered element by selecting the first option
      ('Yehuda') will update the `id` of `currentProgrammer`
      to match the `value` property of the newly selected `<option>`.

      Alternatively, you can control selection through the underlying objects
      used to render each object by binding the `selection` option. When the selected
      `<option>` is changed, the property path provided to `selection`
      will be updated to match the content object of the rendered `<option>`
      element:

      ```javascript

      var yehuda = {firstName: "Yehuda", id: 1, bff4eva: 'tom'}
      var tom = {firstName: "Tom", id: 2, bff4eva: 'yehuda'};

      App.ApplicationController = Ember.ObjectController.extend({
        selectedPerson: tom,
        programmers: [ yehuda, tom ]
      });
      ```

      ```handlebars
      {{view "select"
             content=programmers
             optionValuePath="content.id"
             optionLabelPath="content.firstName"
             selection=selectedPerson}}
      ```

      Would result in the following HTML with a selected option:

      ```html
      <select class="ember-select">
        <option value="1">Yehuda</option>
        <option value="2" selected="selected">Tom</option>
      </select>
      ```

      Interacting with the rendered element by selecting the first option
      ('Yehuda') will update the `selectedPerson` to match the object of
      the newly selected `<option>`. In this case it is the first object
      in the `programmers`

      ## Supplying a Prompt

      A `null` value for the `Ember.Select`'s `value` or `selection` property
      results in there being no `<option>` with a `selected` attribute:

      ```javascript
      App.ApplicationController = Ember.ObjectController.extend({
        selectedProgrammer: null,
        programmers: ["Yehuda", "Tom"]
      });
      ```

      ``` handlebars
      {{view "select"
             content=programmers
             value=selectedProgrammer
      }}
      ```

      Would result in the following HTML:

      ```html
      <select class="ember-select">
        <option value="Yehuda">Yehuda</option>
        <option value="Tom">Tom</option>
      </select>
      ```

      Although `selectedProgrammer` is `null` and no `<option>`
      has a `selected` attribute the rendered HTML will display the
      first item as though it were selected. You can supply a string
      value for the `Ember.Select` to display when there is no selection
      with the `prompt` option:

      ```javascript
      App.ApplicationController = Ember.ObjectController.extend({
        selectedProgrammer: null,
        programmers: [ "Yehuda", "Tom" ]
      });
      ```

      ```handlebars
      {{view "select"
             content=programmers
             value=selectedProgrammer
             prompt="Please select a name"
      }}
      ```

      Would result in the following HTML:

      ```html
      <select class="ember-select">
        <option>Please select a name</option>
        <option value="Yehuda">Yehuda</option>
        <option value="Tom">Tom</option>
      </select>
      ```

      @class Select
      @namespace Ember
      @extends Ember.View
    */
    var Select = View.extend({
      instrumentDisplay: 'Ember.Select',

      tagName: 'select',
      classNames: ['ember-select'],
      defaultTemplate: Ember.Handlebars.template({"1":function(depth0,helpers,partials,data) {
      var stack1, buffer = '';
      data.buffer.push("<option value=\"\">");
      stack1 = helpers._triageMustache.call(depth0, "view.prompt", {"name":"_triageMustache","hash":{},"hashTypes":{},"hashContexts":{},"types":["ID"],"contexts":[depth0],"data":data});
      if (stack1 != null) { data.buffer.push(stack1); }
      data.buffer.push("</option>");
      return buffer;
    },"3":function(depth0,helpers,partials,data) {
      var stack1;
      stack1 = helpers.each.call(depth0, "group", "in", "view.groupedContent", {"name":"each","hash":{},"hashTypes":{},"hashContexts":{},"fn":this.program(4, data),"inverse":this.noop,"types":["ID","ID","ID"],"contexts":[depth0,depth0,depth0],"data":data});
      if (stack1 != null) { data.buffer.push(stack1); }
      else { data.buffer.push(''); }
      },"4":function(depth0,helpers,partials,data) {
      var escapeExpression=this.escapeExpression;
      data.buffer.push(escapeExpression(helpers.view.call(depth0, "view.groupView", {"name":"view","hash":{
        'label': ("group.label"),
        'content': ("group.content")
      },"hashTypes":{'label': "ID",'content': "ID"},"hashContexts":{'label': depth0,'content': depth0},"types":["ID"],"contexts":[depth0],"data":data})));
      },"6":function(depth0,helpers,partials,data) {
      var stack1;
      stack1 = helpers.each.call(depth0, "item", "in", "view.content", {"name":"each","hash":{},"hashTypes":{},"hashContexts":{},"fn":this.program(7, data),"inverse":this.noop,"types":["ID","ID","ID"],"contexts":[depth0,depth0,depth0],"data":data});
      if (stack1 != null) { data.buffer.push(stack1); }
      else { data.buffer.push(''); }
      },"7":function(depth0,helpers,partials,data) {
      var escapeExpression=this.escapeExpression;
      data.buffer.push(escapeExpression(helpers.view.call(depth0, "view.optionView", {"name":"view","hash":{
        'content': ("item")
      },"hashTypes":{'content': "ID"},"hashContexts":{'content': depth0},"types":["ID"],"contexts":[depth0],"data":data})));
      },"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
      var stack1, buffer = '';
      stack1 = helpers['if'].call(depth0, "view.prompt", {"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":this.program(1, data),"inverse":this.noop,"types":["ID"],"contexts":[depth0],"data":data});
      if (stack1 != null) { data.buffer.push(stack1); }
      stack1 = helpers['if'].call(depth0, "view.optionGroupPath", {"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":this.program(3, data),"inverse":this.program(6, data),"types":["ID"],"contexts":[depth0],"data":data});
      if (stack1 != null) { data.buffer.push(stack1); }
      return buffer;
    },"useData":true}),
      attributeBindings: ['multiple', 'disabled', 'tabindex', 'name', 'required', 'autofocus',
                          'form', 'size'],

      /**
        The `multiple` attribute of the select element. Indicates whether multiple
        options can be selected.

        @property multiple
        @type Boolean
        @default false
      */
      multiple: false,

      /**
        The `disabled` attribute of the select element. Indicates whether
        the element is disabled from interactions.

        @property disabled
        @type Boolean
        @default false
      */
      disabled: false,

      /**
        The `required` attribute of the select element. Indicates whether
        a selected option is required for form validation.

        @property required
        @type Boolean
        @default false
        @since 1.5.0
      */
      required: false,

      /**
        The list of options.

        If `optionLabelPath` and `optionValuePath` are not overridden, this should
        be a list of strings, which will serve simultaneously as labels and values.

        Otherwise, this should be a list of objects. For instance:

        ```javascript
        var App = Ember.Application.create();
        var App.MySelect = Ember.Select.extend({
          content: Ember.A([
              { id: 1, firstName: 'Yehuda' },
              { id: 2, firstName: 'Tom' }
            ]),
          optionLabelPath: 'content.firstName',
          optionValuePath: 'content.id'
        });
        ```

        @property content
        @type Array
        @default null
      */
      content: null,

      /**
        When `multiple` is `false`, the element of `content` that is currently
        selected, if any.

        When `multiple` is `true`, an array of such elements.

        @property selection
        @type Object or Array
        @default null
      */
      selection: null,

      /**
        In single selection mode (when `multiple` is `false`), value can be used to
        get the current selection's value or set the selection by it's value.

        It is not currently supported in multiple selection mode.

        @property value
        @type String
        @default null
      */
      value: computed(function(key, value) {
        if (arguments.length === 2) { return value; }
        var valuePath = get(this, 'optionValuePath').replace(/^content\.?/, '');
        return valuePath ? get(this, 'selection.' + valuePath) : get(this, 'selection');
      }).property('selection'),

      /**
        If given, a top-most dummy option will be rendered to serve as a user
        prompt.

        @property prompt
        @type String
        @default null
      */
      prompt: null,

      /**
        The path of the option labels. See [content](/api/classes/Ember.Select.html#property_content).

        @property optionLabelPath
        @type String
        @default 'content'
      */
      optionLabelPath: 'content',

      /**
        The path of the option values. See [content](/api/classes/Ember.Select.html#property_content).

        @property optionValuePath
        @type String
        @default 'content'
      */
      optionValuePath: 'content',

      /**
        The path of the option group.
        When this property is used, `content` should be sorted by `optionGroupPath`.

        @property optionGroupPath
        @type String
        @default null
      */
      optionGroupPath: null,

      /**
        The view class for optgroup.

        @property groupView
        @type Ember.View
        @default Ember.SelectOptgroup
      */
      groupView: SelectOptgroup,

      groupedContent: computed(function() {
        var groupPath = get(this, 'optionGroupPath');
        var groupedContent = emberA();
        var content = get(this, 'content') || [];

        forEach(content, function(item) {
          var label = get(item, groupPath);

          if (get(groupedContent, 'lastObject.label') !== label) {
            groupedContent.pushObject({
              label: label,
              content: emberA()
            });
          }

          get(groupedContent, 'lastObject.content').push(item);
        });

        return groupedContent;
      }).property('optionGroupPath', 'content.@each'),

      /**
        The view class for option.

        @property optionView
        @type Ember.View
        @default Ember.SelectOption
      */
      optionView: SelectOption,

      _change: function() {
        if (get(this, 'multiple')) {
          this._changeMultiple();
        } else {
          this._changeSingle();
        }
      },

      selectionDidChange: observer('selection.@each', function() {
        var selection = get(this, 'selection');
        if (get(this, 'multiple')) {
          if (!isArray(selection)) {
            set(this, 'selection', emberA([selection]));
            return;
          }
          this._selectionDidChangeMultiple();
        } else {
          this._selectionDidChangeSingle();
        }
      }),

      valueDidChange: observer('value', function() {
        var content = get(this, 'content');
        var value = get(this, 'value');
        var valuePath = get(this, 'optionValuePath').replace(/^content\.?/, '');
        var selectedValue = (valuePath ? get(this, 'selection.' + valuePath) : get(this, 'selection'));
        var selection;

        if (value !== selectedValue) {
          selection = content ? content.find(function(obj) {
            return value === (valuePath ? get(obj, valuePath) : obj);
          }) : null;

          this.set('selection', selection);
        }
      }),


      _triggerChange: function() {
        var selection = get(this, 'selection');
        var value = get(this, 'value');

        if (!isNone(selection)) { this.selectionDidChange(); }
        if (!isNone(value)) { this.valueDidChange(); }

        this._change();
      },

      _changeSingle: function() {
        var selectedIndex = this.$()[0].selectedIndex;
        var content = get(this, 'content');
        var prompt = get(this, 'prompt');

        if (!content || !get(content, 'length')) { return; }
        if (prompt && selectedIndex === 0) { set(this, 'selection', null); return; }

        if (prompt) { selectedIndex -= 1; }
        set(this, 'selection', content.objectAt(selectedIndex));
      },


      _changeMultiple: function() {
        var options = this.$('option:selected');
        var prompt = get(this, 'prompt');
        var offset = prompt ? 1 : 0;
        var content = get(this, 'content');
        var selection = get(this, 'selection');

        if (!content) { return; }
        if (options) {
          var selectedIndexes = options.map(function() {
            return this.index - offset;
          }).toArray();
          var newSelection = content.objectsAt(selectedIndexes);

          if (isArray(selection)) {
            replace(selection, 0, get(selection, 'length'), newSelection);
          } else {
            set(this, 'selection', newSelection);
          }
        }
      },

      _selectionDidChangeSingle: function() {
        var el = this.get('element');
        if (!el) { return; }

        var content = get(this, 'content');
        var selection = get(this, 'selection');
        var selectionIndex = content ? indexOf(content, selection) : -1;
        var prompt = get(this, 'prompt');

        if (prompt) { selectionIndex += 1; }
        if (el) { el.selectedIndex = selectionIndex; }
      },

      _selectionDidChangeMultiple: function() {
        var content = get(this, 'content');
        var selection = get(this, 'selection');
        var selectedIndexes = content ? indexesOf(content, selection) : [-1];
        var prompt = get(this, 'prompt');
        var offset = prompt ? 1 : 0;
        var options = this.$('option');
        var adjusted;

        if (options) {
          options.each(function() {
            adjusted = this.index > -1 ? this.index - offset : -1;
            this.selected = indexOf(selectedIndexes, adjusted) > -1;
          });
        }
      },

      init: function() {
        this._super();
        this.on("didInsertElement", this, this._triggerChange);
        this.on("change", this, this._change);
      }
    });

    __exports__["default"] = Select;
    __exports__.Select = Select;
    __exports__.SelectOption = SelectOption;
    __exports__.SelectOptgroup = SelectOptgroup;
  });
enifed("ember-handlebars/controls/text_area",
  ["ember-metal/property_get","ember-views/views/component","ember-handlebars/controls/text_support","ember-metal/mixin","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";

    /**
    @module ember
    @submodule ember-handlebars
    */
    var get = __dependency1__.get;
    var Component = __dependency2__["default"];
    var TextSupport = __dependency3__["default"];
    var observer = __dependency4__.observer;

    /**
      The internal class used to create textarea element when the `{{textarea}}`
      helper is used.

      See [handlebars.helpers.textarea](/api/classes/Ember.Handlebars.helpers.html#method_textarea)  for usage details.

      ## Layout and LayoutName properties

      Because HTML `textarea` elements do not contain inner HTML the `layout` and
      `layoutName` properties will not be applied. See [Ember.View](/api/classes/Ember.View.html)'s
      layout section for more information.

      @class TextArea
      @namespace Ember
      @extends Ember.Component
      @uses Ember.TextSupport
    */
    __exports__["default"] = Component.extend(TextSupport, {
      instrumentDisplay: '{{textarea}}',

      classNames: ['ember-text-area'],

      tagName: "textarea",
      attributeBindings: [
        'rows',
        'cols',
        'name',
        'selectionEnd',
        'selectionStart',
        'wrap',
        'lang',
        'dir'
      ],
      rows: null,
      cols: null,

      _updateElementValue: observer('value', function() {
        // We do this check so cursor position doesn't get affected in IE
        var value = get(this, 'value');
        var $el = this.$();
        if ($el && value !== $el.val()) {
          $el.val(value);
        }
      }),

      init: function() {
        this._super();
        this.on("didInsertElement", this, this._updateElementValue);
      }
    });
  });
enifed("ember-handlebars/controls/text_field",
  ["ember-views/views/component","ember-handlebars/controls/text_support","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /**
    @module ember
    @submodule ember-handlebars
    */
    var Component = __dependency1__["default"];
    var TextSupport = __dependency2__["default"];

    /**

      The internal class used to create text inputs when the `{{input}}`
      helper is used with `type` of `text`.

      See [Handlebars.helpers.input](/api/classes/Ember.Handlebars.helpers.html#method_input)  for usage details.

      ## Layout and LayoutName properties

      Because HTML `input` elements are self closing `layout` and `layoutName`
      properties will not be applied. See [Ember.View](/api/classes/Ember.View.html)'s
      layout section for more information.

      @class TextField
      @namespace Ember
      @extends Ember.Component
      @uses Ember.TextSupport
    */
    __exports__["default"] = Component.extend(TextSupport, {
      instrumentDisplay: '{{input type="text"}}',

      classNames: ['ember-text-field'],
      tagName: "input",
      attributeBindings: [
        'accept',
        'autocomplete',
        'autosave',
        'dir',
        'formaction',
        'formenctype',
        'formmethod',
        'formnovalidate',
        'formtarget',
        'height',
        'inputmode',
        'lang',
        'list',
        'max',
        'min',
        'multiple',
        'name',
        'pattern',
        'size',
        'step',
        'type',
        'value',
        'width'
      ],

      /**
        The `value` attribute of the input element. As the user inputs text, this
        property is updated live.

        @property value
        @type String
        @default ""
      */
      value: "",

      /**
        The `type` attribute of the input element.

        @property type
        @type String
        @default "text"
      */
      type: "text",

      /**
        The `size` of the text field in characters.

        @property size
        @type String
        @default null
      */
      size: null,

      /**
        The `pattern` attribute of input element.

        @property pattern
        @type String
        @default null
      */
      pattern: null,

      /**
        The `min` attribute of input element used with `type="number"` or `type="range"`.

        @property min
        @type String
        @default null
        @since 1.4.0
      */
      min: null,

      /**
        The `max` attribute of input element used with `type="number"` or `type="range"`.

        @property max
        @type String
        @default null
        @since 1.4.0
      */
      max: null
    });
  });
enifed("ember-handlebars/controls/text_support",
  ["ember-metal/property_get","ember-metal/property_set","ember-metal/mixin","ember-runtime/mixins/target_action_support","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    /**
    @module ember
    @submodule ember-handlebars
    */

    var get = __dependency1__.get;
    var set = __dependency2__.set;
    var Mixin = __dependency3__.Mixin;
    var TargetActionSupport = __dependency4__["default"];

    /**
      Shared mixin used by `Ember.TextField` and `Ember.TextArea`.

      @class TextSupport
      @namespace Ember
      @uses Ember.TargetActionSupport
      @extends Ember.Mixin
      @private
    */
    var TextSupport = Mixin.create(TargetActionSupport, {
      value: "",

      attributeBindings: [
        'autocapitalize',
        'autocorrect',
        'autofocus',
        'disabled',
        'form',
        'maxlength',
        'placeholder',
        'readonly',
        'required',
        'selectionDirection',
        'spellcheck',
        'tabindex',
        'title'
      ],
      placeholder: null,
      disabled: false,
      maxlength: null,

      init: function() {
        this._super();
        this.on("paste", this, this._elementValueDidChange);
        this.on("cut", this, this._elementValueDidChange);
        this.on("input", this, this._elementValueDidChange);
      },

      /**
        The action to be sent when the user presses the return key.

        This is similar to the `{{action}}` helper, but is fired when
        the user presses the return key when editing a text field, and sends
        the value of the field as the context.

        @property action
        @type String
        @default null
      */
      action: null,

      /**
        The event that should send the action.

        Options are:

        * `enter`: the user pressed enter
        * `keyPress`: the user pressed a key

        @property onEvent
        @type String
        @default enter
      */
      onEvent: 'enter',

      /**
        Whether the `keyUp` event that triggers an `action` to be sent continues
        propagating to other views.

        By default, when the user presses the return key on their keyboard and
        the text field has an `action` set, the action will be sent to the view's
        controller and the key event will stop propagating.

        If you would like parent views to receive the `keyUp` event even after an
        action has been dispatched, set `bubbles` to true.

        @property bubbles
        @type Boolean
        @default false
      */
      bubbles: false,

      interpretKeyEvents: function(event) {
        var map = TextSupport.KEY_EVENTS;
        var method = map[event.keyCode];

        this._elementValueDidChange();
        if (method) { return this[method](event); }
      },

      _elementValueDidChange: function() {
        set(this, 'value', this.$().val());
      },

      /**
        Called when the user inserts a new line.

        Called by the `Ember.TextSupport` mixin on keyUp if keycode matches 13.
        Uses sendAction to send the `enter` action.

        @method insertNewline
        @param {Event} event
      */
      insertNewline: function(event) {
        sendAction('enter', this, event);
        sendAction('insert-newline', this, event);
      },

      /**
        Called when the user hits escape.

        Called by the `Ember.TextSupport` mixin on keyUp if keycode matches 27.
        Uses sendAction to send the `escape-press` action.

        @method cancel
        @param {Event} event
      */
      cancel: function(event) {
        sendAction('escape-press', this, event);
      },

      change: function(event) {
        this._elementValueDidChange(event);
      },

      /**
        Called when the text area is focused.

        Uses sendAction to send the `focus-in` action.

        @method focusIn
        @param {Event} event
      */
      focusIn: function(event) {
        sendAction('focus-in', this, event);
      },

      /**
        Called when the text area is blurred.

        Uses sendAction to send the `focus-out` action.

        @method focusOut
        @param {Event} event
      */
      focusOut: function(event) {
        this._elementValueDidChange(event);
        sendAction('focus-out', this, event);
      },

      /**
        Called when the user presses a key. Enabled by setting
        the `onEvent` property to `keyPress`.

        Uses sendAction to send the `key-press` action.

        @method keyPress
        @param {Event} event
      */
      keyPress: function(event) {
        sendAction('key-press', this, event);
      },

      /**
        Called when the browser triggers a `keyup` event on the element.

        Uses sendAction to send the `key-up` action passing the current value
        and event as parameters.

        @method keyUp
        @param {Event} event
      */
      keyUp: function(event) {
        this.interpretKeyEvents(event);

        this.sendAction('key-up', get(this, 'value'), event);
      },

      /**
        Called when the browser triggers a `keydown` event on the element.

        Uses sendAction to send the `key-down` action passing the current value
        and event as parameters. Note that generally in key-down the value is unchanged
        (as the key pressing has not completed yet).

        @method keyDown
        @param {Event} event
      */
      keyDown: function(event) {
        this.sendAction('key-down', get(this, 'value'), event);
      }
    });

    TextSupport.KEY_EVENTS = {
      13: 'insertNewline',
      27: 'cancel'
    };

    // In principle, this shouldn't be necessary, but the legacy
    // sendAction semantics for TextField are different from
    // the component semantics so this method normalizes them.
    function sendAction(eventName, view, event) {
      var action = get(view, eventName);
      var on = get(view, 'onEvent');
      var value = get(view, 'value');

      // back-compat support for keyPress as an event name even though
      // it's also a method name that consumes the event (and therefore
      // incompatible with sendAction semantics).
      if (on === eventName || (on === 'keyPress' && eventName === 'key-press')) {
        view.sendAction('action', value);
      }

      view.sendAction(eventName, value);

      if (action || on === eventName) {
        if(!get(view, 'bubbles')) {
          event.stopPropagation();
        }
      }
    }

    __exports__["default"] = TextSupport;
  });
enifed("ember-handlebars/ext",
  ["ember-metal/core","ember-runtime/system/string","ember-handlebars-compiler","ember-metal/property_get","ember-metal/error","ember-metal/mixin","ember-views/views/view","ember-metal/path_cache","ember-metal/streams/stream","ember-metal/streams/read","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __dependency10__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    // Ember.FEATURES, Ember.assert, Ember.Handlebars, Ember.lookup
    // var emberAssert = Ember.assert;

    var fmt = __dependency2__.fmt;

    var EmberHandlebars = __dependency3__["default"];

    var get = __dependency4__.get;
    var EmberError = __dependency5__["default"];
    var IS_BINDING = __dependency6__.IS_BINDING;

    var View = __dependency7__["default"];
    var detectIsGlobal = __dependency8__.isGlobal;

    // late bound via requireModule because of circular dependencies.
    var resolveHelper, SimpleHandlebarsView;

    var Stream = __dependency9__["default"];
    var readArray = __dependency10__.readArray;
    var readHash = __dependency10__.readHash;

    var slice = [].slice;

    /**
      Lookup both on root and on window. If the path starts with
      a keyword, the corresponding object will be looked up in the
      template's data hash and used to resolve the path.

      @method get
      @for Ember.Handlebars
      @param {Object} root The object to look up the property on
      @param {String} path The path to be lookedup
      @param {Object} options The template's option hash
      @deprecated
    */
    function handlebarsGet(root, path, options) {
      Ember.deprecate('Usage of Ember.Handlebars.get is deprecated, use a Component or Ember.Handlebars.makeBoundHelper instead.');

      return options.data.view.getStream(path).value();
    }

    /**
      handlebarsGetView resolves a view based on strings passed into a template.
      For example:

      ```handlebars
      {{view "some-view"}}
      {{view view.someView}}
      {{view App.SomeView}} {{! deprecated }}
      ```

      A value is first checked to be a string- non-strings are presumed to be
      an object and returned. This handles the "access a view on a context"
      case (line 2 in the above examples).

      Next a string is normalized, then called on the context with `get`. If
      there is still no value, a GlobalPath will be fetched from the global
      context (raising a deprecation) and a localPath will be passed to the
      container to be looked up.

      @private
      @for Ember.Handlebars
      @param {Object} context The context of the template being rendered
      @param {String} path The path to be lookedup
      @param {Object} container The container
      @param {Object} data The template's data hash
    */
    function handlebarsGetView(context, path, container, data) {
      var viewClass;
      if ('string' === typeof path) {
        if (!data) {
          throw new Error("handlebarsGetView: must pass data");
        }

        // Only lookup view class on context if there is a context. If not,
        // the global lookup path on get may kick in.
        var lazyValue = data.view.getStream(path);
        viewClass = lazyValue.value();
        var isGlobal = detectIsGlobal(path);

        if (!viewClass && !isGlobal) {
          Ember.assert("View requires a container to resolve views not passed in through the context", !!container);
          viewClass = container.lookupFactory('view:'+path);
        }
        if (!viewClass && isGlobal) {
          var globalViewClass = get(path);
          Ember.deprecate('Resolved the view "'+path+'" on the global context. Pass a view name to be looked' +
                          ' up on the container instead, such as {{view "select"}}.' +
                          ' http://emberjs.com/guides/deprecations#toc_global-lookup-of-views', !globalViewClass);
          if (globalViewClass) {
            viewClass = globalViewClass;
          }
        }
      } else {
        viewClass = path;
      }

      // Sometimes a view's value is yet another path
      if ('string' === typeof viewClass && data && data.view) {
        viewClass = handlebarsGetView(data.view, viewClass, container, data);
      }

      Ember.assert(
        fmt(path+" must be a subclass or an instance of Ember.View, not %@", [viewClass]),
        View.detect(viewClass) || View.detectInstance(viewClass)
      );

      return viewClass;
    }

    function stringifyValue(value, shouldEscape) {
      if (value === null || value === undefined) {
        value = "";
      } else if (!(value instanceof Handlebars.SafeString)) {
        value = String(value);
      }

      if (shouldEscape) {
        value = Handlebars.Utils.escapeExpression(value);
      }

      return value;
    }

    __exports__.stringifyValue = stringifyValue;/**
      Registers a helper in Handlebars that will be called if no property with the
      given name can be found on the current context object, and no helper with
      that name is registered.

      This throws an exception with a more helpful error message so the user can
      track down where the problem is happening.

      @private
      @method helperMissing
      @for Ember.Handlebars.helpers
      @param {String} path
      @param {Hash} options
    */
    function helperMissingHelper(path) {
      if (!resolveHelper) {
        resolveHelper = requireModule('ember-handlebars/helpers/binding')['resolveHelper'];
      } // ES6TODO: stupid circular dep

      var error, fmtError, view = "";

      var options = arguments[arguments.length - 1];

      var helper = resolveHelper(options.data.view.container, options.name);

      if (helper) {
        return helper.apply(this, arguments);
      }

      if (options.data) {
        view = options.data.view;
      }

      if (options.name.match(/-/)) {
        error = "%@ Handlebars error: Could not find component or helper named '%@'";
        fmtError = fmt(error, [view, options.name]);
      } else {
        error = "%@ Handlebars error: Could not find property '%@' on object %@.";
        fmtError = fmt(error, [view, options.name, this]);
      }

      throw new EmberError(fmtError);
    }

    __exports__.helperMissingHelper = helperMissingHelper;/**
      @private
      @method blockHelperMissingHelper
      @for Ember.Handlebars.helpers
    */
    function blockHelperMissingHelper() {
      return;
    }

    __exports__.blockHelperMissingHelper = blockHelperMissingHelper;/**
      Register a bound handlebars helper. Bound helpers behave similarly to regular
      handlebars helpers, with the added ability to re-render when the underlying data
      changes.

      ## Simple example

      ```javascript
      Ember.Handlebars.registerBoundHelper('capitalize', function(value) {
        return Ember.String.capitalize(value);
      });
      ```

      The above bound helper can be used inside of templates as follows:

      ```handlebars
      {{capitalize name}}
      ```

      In this case, when the `name` property of the template's context changes,
      the rendered value of the helper will update to reflect this change.

      ## Example with options

      Like normal handlebars helpers, bound helpers have access to the options
      passed into the helper call.

      ```javascript
      Ember.Handlebars.registerBoundHelper('repeat', function(value, options) {
        var count = options.hash.count;
        var a = [];
        while(a.length < count) {
            a.push(value);
        }
        return a.join('');
      });
      ```

      This helper could be used in a template as follows:

      ```handlebars
      {{repeat text count=3}}
      ```

      ## Example with bound options

      Bound hash options are also supported. Example:

      ```handlebars
      {{repeat text count=numRepeats}}
      ```

      In this example, count will be bound to the value of
      the `numRepeats` property on the context. If that property
      changes, the helper will be re-rendered.

      ## Example with extra dependencies

      The `Ember.Handlebars.registerBoundHelper` method takes a variable length
      third parameter which indicates extra dependencies on the passed in value.
      This allows the handlebars helper to update when these dependencies change.

      ```javascript
      Ember.Handlebars.registerBoundHelper('capitalizeName', function(value) {
        return value.get('name').toUpperCase();
      }, 'name');
      ```

      ## Example with multiple bound properties

      `Ember.Handlebars.registerBoundHelper` supports binding to
      multiple properties, e.g.:

      ```javascript
      Ember.Handlebars.registerBoundHelper('concatenate', function() {
        var values = Array.prototype.slice.call(arguments, 0, -1);
        return values.join('||');
      });
      ```

      Which allows for template syntax such as `{{concatenate prop1 prop2}}` or
      `{{concatenate prop1 prop2 prop3}}`. If any of the properties change,
      the helper will re-render.  Note that dependency keys cannot be
      using in conjunction with multi-property helpers, since it is ambiguous
      which property the dependent keys would belong to.

      ## Use with unbound helper

      The `{{unbound}}` helper can be used with bound helper invocations
      to render them in their unbound form, e.g.

      ```handlebars
      {{unbound capitalize name}}
      ```

      In this example, if the name property changes, the helper
      will not re-render.

      ## Use with blocks not supported

      Bound helpers do not support use with Handlebars blocks or
      the addition of child views of any kind.

      @method registerBoundHelper
      @for Ember.Handlebars
      @param {String} name
      @param {Function} function
      @param {String} dependentKeys*
    */
    function registerBoundHelper(name, fn) {
      var boundHelperArgs = slice.call(arguments, 1);
      var boundFn = makeBoundHelper.apply(this, boundHelperArgs);
      EmberHandlebars.registerHelper(name, boundFn);
    }

    __exports__.registerBoundHelper = registerBoundHelper;/**
      A helper function used by `registerBoundHelper`. Takes the
      provided Handlebars helper function fn and returns it in wrapped
      bound helper form.

      The main use case for using this outside of `registerBoundHelper`
      is for registering helpers on the container:

      ```js
      var boundHelperFn = Ember.Handlebars.makeBoundHelper(function(word) {
        return word.toUpperCase();
      });

      container.register('helper:my-bound-helper', boundHelperFn);
      ```

      In the above example, if the helper function hadn't been wrapped in
      `makeBoundHelper`, the registered helper would be unbound.

      @method makeBoundHelper
      @for Ember.Handlebars
      @param {Function} function
      @param {String} dependentKeys*
      @since 1.2.0
    */
    function makeBoundHelper(fn) {
      if (!SimpleHandlebarsView) {
        SimpleHandlebarsView = requireModule('ember-handlebars/views/handlebars_bound_view')['SimpleHandlebarsView'];
      } // ES6TODO: stupid circular dep

      var dependentKeys = [];
      for (var i = 1; i < arguments.length; i++) {
        dependentKeys.push(arguments[i]);
      }

      function helper() {
        var numParams = arguments.length - 1;
        var options = arguments[numParams];
        var data = options.data;
        var view = data.view;
        var types = options.types;
        var hash = options.hash;
        var hashTypes = options.hashTypes;
        var context = this;

        Ember.assert("registerBoundHelper-generated helpers do not support use with Handlebars blocks.", !options.fn);

        var properties = new Array(numParams);
        var params = new Array(numParams);

        for (var i = 0; i < numParams; i++) {
          properties[i] = arguments[i];
          if (types[i] === 'ID') {
            params[i] = view.getStream(arguments[i]);
          } else {
            params[i] = arguments[i];
          }
        }

        for (var prop in hash) {
          if (IS_BINDING.test(prop)) {
            hash[prop.slice(0, -7)] = view.getStream(hash[prop]);
            hash[prop] = undefined;
          } else if (hashTypes[prop] === 'ID') {
            hash[prop] = view.getStream(hash[prop]);
          }
        }

        var valueFn = function() {
          var args = readArray(params);
          args.push({
            hash: readHash(hash),
            data: { properties: properties }
          });
          return fn.apply(context, args);
        };

        if (data.isUnbound) {
          return valueFn();
        } else {
          var lazyValue = new Stream(valueFn);
          var bindView = new SimpleHandlebarsView(lazyValue, !options.hash.unescaped);
          view.appendChild(bindView);

          var scheduledRerender = view._wrapAsScheduled(bindView.rerender);
          lazyValue.subscribe(scheduledRerender, bindView);

          var param;

          for (i = 0; i < numParams; i++) {
            param = params[i];
            if (param && param.isStream) {
              param.subscribe(lazyValue.notify, lazyValue);
            }
          }

          for (prop in hash) {
            param = hash[prop];
            if (param && param.isStream) {
              param.subscribe(lazyValue.notify, lazyValue);
            }
          }

          if (numParams > 0) {
            var firstParam = params[0];
            // Only bother with subscriptions if the first argument
            // is a stream itself, and not a primitive.
            if (firstParam && firstParam.isStream) {
              var onDependentKeyNotify = function onDependentKeyNotify(stream) {
                stream.value();
                lazyValue.notify();
              };
              for (i = 0; i < dependentKeys.length; i++) {
                var childParam = firstParam.get(dependentKeys[i]);
                childParam.value();
                childParam.subscribe(onDependentKeyNotify);
              }
            }
          }
        }
      }

      return helper;
    }

    __exports__.makeBoundHelper = makeBoundHelper;
    __exports__.handlebarsGetView = handlebarsGetView;
    __exports__.handlebarsGet = handlebarsGet;
  });
enifed("ember-handlebars/helpers/bind_attr",
  ["ember-metal/core","ember-handlebars-compiler","ember-metal/utils","ember-runtime/system/string","ember-metal/array","ember-views/views/view","ember-metal/keys","ember-views/system/sanitize_attribute_value","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __exports__) {
    "use strict";
    /**
    @module ember
    @submodule ember-handlebars
    */

    var Ember = __dependency1__["default"];
    // Ember.assert
    var EmberHandlebars = __dependency2__["default"];

    var uuid = __dependency3__.uuid;
    var fmt = __dependency4__.fmt;
    var typeOf = __dependency3__.typeOf;
    var forEach = __dependency5__.forEach;
    var View = __dependency6__["default"];
    var keys = __dependency7__["default"];

    var sanitizeAttributeValue = __dependency8__["default"];

    var helpers = EmberHandlebars.helpers;
    var SafeString = EmberHandlebars.SafeString;

    /**
      `bind-attr` allows you to create a binding between DOM element attributes and
      Ember objects. For example:

      ```handlebars
      <img {{bind-attr src="imageUrl" alt="imageTitle"}}>
      ```

      The above handlebars template will fill the `<img>`'s `src` attribute with
      the value of the property referenced with `"imageUrl"` and its `alt`
      attribute with the value of the property referenced with `"imageTitle"`.

      If the rendering context of this template is the following object:

      ```javascript
      {
        imageUrl: 'http://lolcats.info/haz-a-funny',
        imageTitle: 'A humorous image of a cat'
      }
      ```

      The resulting HTML output will be:

      ```html
      <img src="http://lolcats.info/haz-a-funny" alt="A humorous image of a cat">
      ```

      `bind-attr` cannot redeclare existing DOM element attributes. The use of `src`
      in the following `bind-attr` example will be ignored and the hard coded value
      of `src="/failwhale.gif"` will take precedence:

      ```handlebars
      <img src="/failwhale.gif" {{bind-attr src="imageUrl" alt="imageTitle"}}>
      ```

      ### `bind-attr` and the `class` attribute

      `bind-attr` supports a special syntax for handling a number of cases unique
      to the `class` DOM element attribute. The `class` attribute combines
      multiple discrete values into a single attribute as a space-delimited
      list of strings. Each string can be:

      * a string return value of an object's property.
      * a boolean return value of an object's property
      * a hard-coded value

      A string return value works identically to other uses of `bind-attr`. The
      return value of the property will become the value of the attribute. For
      example, the following view and template:

      ```javascript
        AView = View.extend({
          someProperty: function() {
            return "aValue";
          }.property()
        })
      ```

      ```handlebars
      <img {{bind-attr class="view.someProperty}}>
      ```

      Result in the following rendered output:

      ```html
      <img class="aValue">
      ```

      A boolean return value will insert a specified class name if the property
      returns `true` and remove the class name if the property returns `false`.

      A class name is provided via the syntax
      `somePropertyName:class-name-if-true`.

      ```javascript
      AView = View.extend({
        someBool: true
      })
      ```

      ```handlebars
      <img {{bind-attr class="view.someBool:class-name-if-true"}}>
      ```

      Result in the following rendered output:

      ```html
      <img class="class-name-if-true">
      ```

      An additional section of the binding can be provided if you want to
      replace the existing class instead of removing it when the boolean
      value changes:

      ```handlebars
      <img {{bind-attr class="view.someBool:class-name-if-true:class-name-if-false"}}>
      ```

      A hard-coded value can be used by prepending `:` to the desired
      class name: `:class-name-to-always-apply`.

      ```handlebars
      <img {{bind-attr class=":class-name-to-always-apply"}}>
      ```

      Results in the following rendered output:

      ```html
      <img class="class-name-to-always-apply">
      ```

      All three strategies - string return value, boolean return value, and
      hard-coded value â€“ can be combined in a single declaration:

      ```handlebars
      <img {{bind-attr class=":class-name-to-always-apply view.someBool:class-name-if-true view.someProperty"}}>
      ```

      @method bind-attr
      @for Ember.Handlebars.helpers
      @param {Hash} options
      @return {String} HTML string
    */
    function bindAttrHelper(options) {
      var attrs = options.hash;

      Ember.assert("You must specify at least one hash argument to bind-attr", !!keys(attrs).length);

      var view = options.data.view;
      var ret = [];

      // we relied on the behavior of calling without
      // context to mean this === window, but when running
      // "use strict", it's possible for this to === undefined;
      var ctx = this || window;

      // Generate a unique id for this element. This will be added as a
      // data attribute to the element so it can be looked up when
      // the bound property changes.
      var dataId = uuid();

      // Handle classes differently, as we can bind multiple classes
      var classBindings = attrs['class'];
      if (classBindings != null) {
        var classResults = bindClasses(ctx, classBindings, view, dataId, options);

        ret.push('class="' + Handlebars.Utils.escapeExpression(classResults.join(' ')) + '"');
        delete attrs['class'];
      }

      var attrKeys = keys(attrs);

      // For each attribute passed, create an observer and emit the
      // current value of the property as an attribute.
      forEach.call(attrKeys, function(attr) {
        var path = attrs[attr];

        Ember.assert(fmt("You must provide an expression as the value of bound attribute." +
                         " You specified: %@=%@", [attr, path]), typeof path === 'string');

        var lazyValue = view.getStream(path);
        var value = lazyValue.value();
        value = sanitizeAttributeValue(null, attr, value);
        var type = typeOf(value);

        Ember.assert(fmt("Attributes must be numbers, strings or booleans, not %@", [value]),
                     value === null || value === undefined || type === 'number' || type === 'string' || type === 'boolean');

        lazyValue.subscribe(view._wrapAsScheduled(function applyAttributeBindings() {
          var result = lazyValue.value();

          Ember.assert(fmt("Attributes must be numbers, strings or booleans, not %@", [result]),
                       result === null || result === undefined || typeof result === 'number' ||
                         typeof result === 'string' || typeof result === 'boolean');

          var elem = view.$("[data-bindattr-" + dataId + "='" + dataId + "']");

          Ember.assert("An attribute binding was triggered when the element was not in the DOM", elem && elem.length !== 0);

          View.applyAttributeBindings(elem, attr, result);
        }));

        // if this changes, also change the logic in ember-views/lib/views/view.js
        if ((type === 'string' || (type === 'number' && !isNaN(value)))) {
          ret.push(attr + '="' + Handlebars.Utils.escapeExpression(value) + '"');
        } else if (value && type === 'boolean') {
          // The developer controls the attr name, so it should always be safe
          ret.push(attr + '="' + attr + '"');
        }
      }, this);

      // Add the unique identifier
      // NOTE: We use all lower-case since Firefox has problems with mixed case in SVG
      ret.push('data-bindattr-' + dataId + '="' + dataId + '"');
      return new SafeString(ret.join(' '));
    }

    /**
      See `bind-attr`

      @method bindAttr
      @for Ember.Handlebars.helpers
      @deprecated
      @param {Function} context
      @param {Hash} options
      @return {String} HTML string
    */
    function bindAttrHelperDeprecated() {
      Ember.deprecate("The 'bindAttr' view helper is deprecated in favor of 'bind-attr'");

      return helpers['bind-attr'].apply(this, arguments);
    }

    /**
      Helper that, given a space-separated string of property paths and a context,
      returns an array of class names. Calling this method also has the side
      effect of setting up observers at those property paths, such that if they
      change, the correct class name will be reapplied to the DOM element.

      For example, if you pass the string "fooBar", it will first look up the
      "fooBar" value of the context. If that value is true, it will add the
      "foo-bar" class to the current element (i.e., the dasherized form of
      "fooBar"). If the value is a string, it will add that string as the class.
      Otherwise, it will not add any new class name.

      @private
      @method bindClasses
      @for Ember.Handlebars
      @param {Ember.Object} context The context from which to lookup properties
      @param {String} classBindings A string, space-separated, of class bindings
        to use
      @param {View} view The view in which observers should look for the
        element to update
      @param {Srting} bindAttrId Optional bindAttr id used to lookup elements
      @return {Array} An array of class names to add
    */
    function bindClasses(context, classBindings, view, bindAttrId, options) {
      var ret = [];
      var newClass, value, elem;

      // For each property passed, loop through and setup
      // an observer.
      forEach.call(classBindings.split(' '), function(binding) {

        // Variable in which the old class value is saved. The observer function
        // closes over this variable, so it knows which string to remove when
        // the property changes.
        var oldClass;
        var parsedPath = View._parsePropertyPath(binding);
        var path = parsedPath.path;
        var initialValue;

        if (path === '') {
          initialValue = true;
        } else {
          var lazyValue = view.getStream(path);
          initialValue = lazyValue.value();

          // Set up an observer on the context. If the property changes, toggle the
          // class name.
          lazyValue.subscribe(view._wrapAsScheduled(function applyClassNameBindings() {
            // Get the current value of the property
            var value = lazyValue.value();
            newClass = classStringForParsedPath(parsedPath, value);
            elem = bindAttrId ? view.$("[data-bindattr-" + bindAttrId + "='" + bindAttrId + "']") : view.$();

            Ember.assert("A class name binding was triggered when the element was not in the DOM", elem && elem.length !== 0);

            // If we had previously added a class to the element, remove it.
            if (oldClass) {
              elem.removeClass(oldClass);
            }

            // If necessary, add a new class. Make sure we keep track of it so
            // it can be removed in the future.
            if (newClass) {
              elem.addClass(newClass);
              oldClass = newClass;
            } else {
              oldClass = null;
            }
          }));
        }

        // We've already setup the observer; now we just need to figure out the
        // correct behavior right now on the first pass through.
        value = classStringForParsedPath(parsedPath, initialValue);

        if (value) {
          ret.push(value);

          // Make sure we save the current value so that it can be removed if the
          // observer fires.
          oldClass = value;
        }
      });

      return ret;
    }

    function classStringForParsedPath(parsedPath, value) {
      return View._classStringForValue(parsedPath.path, value, parsedPath.className, parsedPath.falsyClassName);
    }

    __exports__["default"] = bindAttrHelper;

    __exports__.bindAttrHelper = bindAttrHelper;
    __exports__.bindAttrHelperDeprecated = bindAttrHelperDeprecated;
    __exports__.bindClasses = bindClasses;
  });
enifed("ember-handlebars/helpers/binding",
  ["ember-metal/core","ember-handlebars-compiler","ember-metal/is_none","ember-metal/run_loop","ember-metal/cache","ember-metal/streams/simple","ember-handlebars/views/handlebars_bound_view","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    /**
    @module ember
    @submodule ember-handlebars
    */

    var Ember = __dependency1__["default"];
    // Ember.assert
    var EmberHandlebars = __dependency2__["default"];

    var isNone = __dependency3__["default"];
    var run = __dependency4__["default"];
    var Cache = __dependency5__["default"];
    var SimpleStream = __dependency6__["default"];

    var _HandlebarsBoundView = __dependency7__._HandlebarsBoundView;
    var SimpleHandlebarsView = __dependency7__.SimpleHandlebarsView;

    var helpers = EmberHandlebars.helpers;

    function exists(value) {
      return !isNone(value);
    }

    // Binds a property into the DOM. This will create a hook in DOM that the
    // KVO system will look for and update if the property changes.
    function bind(property, options, preserveContext, shouldDisplay, valueNormalizer, childProperties, _viewClass) {
      var data = options.data;
      var view = data.view;

      // we relied on the behavior of calling without
      // context to mean this === window, but when running
      // "use strict", it's possible for this to === undefined;
      var currentContext = this || window;

      var valueStream = view.getStream(property);
      var lazyValue;

      if (childProperties) {
        lazyValue = new SimpleStream(valueStream);

        var subscriber = function(childStream) {
          childStream.value();
          lazyValue.notify();
        };

        for (var i = 0; i < childProperties.length; i++) {
          var childStream = valueStream.get(childProperties[i]);
          childStream.value();
          childStream.subscribe(subscriber);
        }
      } else {
        lazyValue = valueStream;
      }

      // Set up observers for observable objects
      var viewClass = _viewClass || _HandlebarsBoundView;
      var viewOptions = {
        preserveContext: preserveContext,
        shouldDisplayFunc: shouldDisplay,
        valueNormalizerFunc: valueNormalizer,
        displayTemplate: options.fn,
        inverseTemplate: options.inverse,
        lazyValue: lazyValue,
        previousContext: currentContext,
        isEscaped: !options.hash.unescaped,
        templateData: options.data,
        templateHash: options.hash,
        helperName: options.helperName
      };

      if (options.keywords) {
        viewOptions._keywords = options.keywords;
      }

      // Create the view that will wrap the output of this template/property
      // and add it to the nearest view's childViews array.
      // See the documentation of Ember._HandlebarsBoundView for more.
      var bindView = view.createChildView(viewClass, viewOptions);

      view.appendChild(bindView);

      lazyValue.subscribe(view._wrapAsScheduled(function() {
        run.scheduleOnce('render', bindView, 'rerenderIfNeeded');
      }));
    }

    function simpleBind(currentContext, lazyValue, options) {
      var data = options.data;
      var view = data.view;

      var bindView = new SimpleHandlebarsView(
        lazyValue, !options.hash.unescaped
      );

      bindView._parentView = view;
      view.appendChild(bindView);

      lazyValue.subscribe(view._wrapAsScheduled(function() {
        run.scheduleOnce('render', bindView, 'rerender');
      }));
    }

    /**
      '_triageMustache' is used internally select between a binding, helper, or component for
      the given context. Until this point, it would be hard to determine if the
      mustache is a property reference or a regular helper reference. This triage
      helper resolves that.

      This would not be typically invoked by directly.

      @private
      @method _triageMustache
      @for Ember.Handlebars.helpers
      @param {String} property Property/helperID to triage
      @param {Object} options hash of template/rendering options
      @return {String} HTML string
    */
    function _triageMustacheHelper(property, options) {
      Ember.assert("You cannot pass more than one argument to the _triageMustache helper", arguments.length <= 2);

      var helper = EmberHandlebars.resolveHelper(options.data.view.container, property);
      if (helper) {
        return helper.call(this, options);
      }

      return helpers.bind.call(this, property, options);
    }

    var ISNT_HELPER_CACHE = new Cache(1000, function(key) {
      return key.indexOf('-') === -1;
    });
    __exports__.ISNT_HELPER_CACHE = ISNT_HELPER_CACHE;
    /**
      Used to lookup/resolve handlebars helpers. The lookup order is:

      * Look for a registered helper
      * If a dash exists in the name:
        * Look for a helper registed in the container
        * Use Ember.ComponentLookup to find an Ember.Component that resolves
          to the given name

      @private
      @method resolveHelper
      @param {Container} container
      @param {String} name the name of the helper to lookup
      @return {Handlebars Helper}
    */
    function resolveHelper(container, name) {
      if (helpers[name]) {
        return helpers[name];
      }

      if (!container || ISNT_HELPER_CACHE.get(name)) {
        return;
      }

      var helper = container.lookup('helper:' + name);
      if (!helper) {
        var componentLookup = container.lookup('component-lookup:main');
        Ember.assert("Could not find 'component-lookup:main' on the provided container," +
                     " which is necessary for performing component lookups", componentLookup);

        var Component = componentLookup.lookupFactory(name, container);
        if (Component) {
          helper = EmberHandlebars.makeViewHelper(Component);
          container.register('helper:' + name, helper);
        }
      }
      return helper;
    }


    /**
      `bind` can be used to display a value, then update that value if it
      changes. For example, if you wanted to print the `title` property of
      `content`:

      ```handlebars
      {{bind "content.title"}}
      ```

      This will return the `title` property as a string, then create a new observer
      at the specified path. If it changes, it will update the value in DOM. Note
      that if you need to support IE7 and IE8 you must modify the model objects
      properties using `Ember.get()` and `Ember.set()` for this to work as it
      relies on Ember's KVO system. For all other browsers this will be handled for
      you automatically.

      @private
      @method bind
      @for Ember.Handlebars.helpers
      @param {String} property Property to bind
      @param {Function} fn Context to provide for rendering
      @return {String} HTML string
    */
    function bindHelper(property, options) {
      Ember.assert("You cannot pass more than one argument to the bind helper", arguments.length <= 2);

      var context = (options.contexts && options.contexts.length) ? options.contexts[0] : this;

      if (!options.fn) {
        var lazyValue = options.data.view.getStream(property);
        return simpleBind(context, lazyValue, options);
      }

      options.helperName = 'bind';

      return bind.call(context, property, options, false, exists);
    }

    __exports__.bind = bind;
    __exports__._triageMustacheHelper = _triageMustacheHelper;
    __exports__.resolveHelper = resolveHelper;
    __exports__.bindHelper = bindHelper;
  });
enifed("ember-handlebars/helpers/collection",
  ["ember-metal/core","ember-handlebars-compiler","ember-metal/mixin","ember-runtime/system/string","ember-metal/property_get","ember-metal/streams/simple","ember-handlebars/ext","ember-handlebars/helpers/view","ember-views/views/view","ember-views/views/collection_view","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __dependency8__, __dependency9__, __dependency10__, __exports__) {
    "use strict";
    /**
    @module ember
    @submodule ember-handlebars
    */

    var Ember = __dependency1__["default"];
    // Ember.assert, Ember.deprecate

    // var emberAssert = Ember.assert;
        // emberDeprecate = Ember.deprecate;

    var EmberHandlebars = __dependency2__["default"];

    var IS_BINDING = __dependency3__.IS_BINDING;
    var fmt = __dependency4__.fmt;
    var get = __dependency5__.get;
    var SimpleStream = __dependency6__["default"];
    var handlebarsGetView = __dependency7__.handlebarsGetView;
    var ViewHelper = __dependency8__.ViewHelper;
    var View = __dependency9__["default"];
    var CollectionView = __dependency10__["default"];

    /**
      `{{collection}}` is a `Ember.Handlebars` helper for adding instances of
      `Ember.CollectionView` to a template. See [Ember.CollectionView](/api/classes/Ember.CollectionView.html)
       for additional information on how a `CollectionView` functions.

      `{{collection}}`'s primary use is as a block helper with a `contentBinding`
      option pointing towards an `Ember.Array`-compatible object. An `Ember.View`
      instance will be created for each item in its `content` property. Each view
      will have its own `content` property set to the appropriate item in the
      collection.

      The provided block will be applied as the template for each item's view.

      Given an empty `<body>` the following template:

      ```handlebars
      {{! application.hbs }}
      {{#collection content=model}}
        Hi {{view.content.name}}
      {{/collection}}
      ```

      And the following application code

      ```javascript
      App = Ember.Application.create();
      App.ApplicationRoute = Ember.Route.extend({
        model: function(){
          return [{name: 'Yehuda'},{name: 'Tom'},{name: 'Peter'}];
        }
      });
      ```

      The following HTML will result:

      ```html
      <div class="ember-view">
        <div class="ember-view">Hi Yehuda</div>
        <div class="ember-view">Hi Tom</div>
        <div class="ember-view">Hi Peter</div>
      </div>
      ```

      ### Non-block version of collection

      If you provide an `itemViewClass` option that has its own `template` you may
      omit the block.

      The following template:

      ```handlebars
      {{! application.hbs }}
      {{collection content=model itemViewClass="an-item"}}
      ```

      And application code

      ```javascript
      App = Ember.Application.create();
      App.ApplicationRoute = Ember.Route.extend({
        model: function(){
          return [{name: 'Yehuda'},{name: 'Tom'},{name: 'Peter'}];
        }
      });

      App.AnItemView = Ember.View.extend({
        template: Ember.Handlebars.compile("Greetings {{view.content.name}}")
      });
      ```

      Will result in the HTML structure below

      ```html
      <div class="ember-view">
        <div class="ember-view">Greetings Yehuda</div>
        <div class="ember-view">Greetings Tom</div>
        <div class="ember-view">Greetings Peter</div>
      </div>
      ```

      ### Specifying a CollectionView subclass

      By default the `{{collection}}` helper will create an instance of
      `Ember.CollectionView`. You can supply a `Ember.CollectionView` subclass to
      the helper by passing it as the first argument:

      ```handlebars
      {{#collection "my-custom-collection" content=model}}
        Hi {{view.content.name}}
      {{/collection}}
      ```

      This example would look for the class `App.MyCustomCollection`.

      ### Forwarded `item.*`-named Options

      As with the `{{view}}`, helper options passed to the `{{collection}}` will be
      set on the resulting `Ember.CollectionView` as properties. Additionally,
      options prefixed with `item` will be applied to the views rendered for each
      item (note the camelcasing):

      ```handlebars
      {{#collection content=model
                    itemTagName="p"
                    itemClassNames="greeting"}}
        Howdy {{view.content.name}}
      {{/collection}}
      ```

      Will result in the following HTML structure:

      ```html
      <div class="ember-view">
        <p class="ember-view greeting">Howdy Yehuda</p>
        <p class="ember-view greeting">Howdy Tom</p>
        <p class="ember-view greeting">Howdy Peter</p>
      </div>
      ```

      @method collection
      @for Ember.Handlebars.helpers
      @param {String} path
      @param {Hash} options
      @return {String} HTML string
      @deprecated Use `{{each}}` helper instead.
    */
    function collectionHelper(path, options) {
      Ember.deprecate("Using the {{collection}} helper without specifying a class has been" +
                      " deprecated as the {{each}} helper now supports the same functionality.", path !== 'collection');

      // If no path is provided, treat path param as options.
      if (path && path.data && path.data.isRenderData) {
        options = path;
        path = undefined;
        Ember.assert("You cannot pass more than one argument to the collection helper", arguments.length === 1);
      } else {
        Ember.assert("You cannot pass more than one argument to the collection helper", arguments.length === 2);
      }

      var fn        = options.fn,
          data      = options.data,
          inverse   = options.inverse,
          view      = options.data.view,
          // This should be deterministic, and should probably come from a
          // parent view and not the controller.
          container = (view.controller && view.controller.container ? view.controller.container : view.container);

      // If passed a path string, convert that into an object.
      // Otherwise, just default to the standard class.
      var collectionClass;
      if (path) {
        collectionClass = handlebarsGetView(this, path, container, options.data);
        Ember.assert(fmt("%@ #collection: Could not find collection class %@", [data.view, path]), !!collectionClass);
      }
      else {
        collectionClass = CollectionView;
      }

      var hash = options.hash;
      var hashTypes = options.hashTypes;
      var itemHash = {};
      var match;

      // Extract item view class if provided else default to the standard class
      var collectionPrototype = collectionClass.proto();
      var itemViewClass;

      if (hash.itemView) {
        itemViewClass = hash.itemView;
      } else if (hash.itemViewClass) {
        if (hashTypes.itemViewClass === 'ID') {
          var itemViewClassStream = view.getStream(hash.itemViewClass);
          Ember.deprecate('Resolved the view "'+hash.itemViewClass+'" on the global context. Pass a view name to be looked up on the container instead, such as {{view "select"}}. http://emberjs.com/guides/deprecations#toc_global-lookup-of-views', !itemViewClassStream.isGlobal());
          itemViewClass = itemViewClassStream.value();
        } else {
          itemViewClass = hash.itemViewClass;
        }
      } else {
        itemViewClass = collectionPrototype.itemViewClass;
      }

      if (typeof itemViewClass === 'string') {
        itemViewClass = container.lookupFactory('view:'+itemViewClass);
      }

      Ember.assert(fmt("%@ #collection: Could not find itemViewClass %@", [data.view, itemViewClass]), !!itemViewClass);

      delete hash.itemViewClass;
      delete hash.itemView;
      delete hashTypes.itemViewClass;
      delete hashTypes.itemView;

      // Go through options passed to the {{collection}} helper and extract options
      // that configure item views instead of the collection itself.
      for (var prop in hash) {
        if (prop === 'itemController' || prop === 'itemClassBinding') {
          continue;
        }
        if (hash.hasOwnProperty(prop)) {
          match = prop.match(/^item(.)(.*)$/);
          if (match) {
            var childProp = match[1].toLowerCase() + match[2];

            if (hashTypes[prop] === 'ID' || IS_BINDING.test(prop)) {
              itemHash[childProp] = view._getBindingForStream(hash[prop]);
            } else {
              itemHash[childProp] = hash[prop];
            }
            delete hash[prop];
          }
        }
      }

      if (fn) {
        itemHash.template = fn;
        delete options.fn;
      }

      var emptyViewClass;
      if (inverse && inverse !== EmberHandlebars.VM.noop) {
        emptyViewClass = get(collectionPrototype, 'emptyViewClass');
        emptyViewClass = emptyViewClass.extend({
              template: inverse,
              tagName: itemHash.tagName
        });
      } else if (hash.emptyViewClass) {
        emptyViewClass = handlebarsGetView(this, hash.emptyViewClass, container, options.data);
      }
      if (emptyViewClass) { hash.emptyView = emptyViewClass; }

      if (hash.keyword) {
        itemHash._contextBinding = '_parentView.context';
      } else {
        itemHash._contextBinding = 'content';
      }

      var viewOptions = ViewHelper.propertiesFromHTMLOptions({ data: data, hash: itemHash }, this);

      if (hash.itemClassBinding) {
        var itemClassBindings = hash.itemClassBinding.split(' ');

        for (var i = 0; i < itemClassBindings.length; i++) {
          var parsedPath = View._parsePropertyPath(itemClassBindings[i]);
          if (parsedPath.path === '') {
            parsedPath.stream = new SimpleStream(true);
          } else {
            parsedPath.stream = view.getStream(parsedPath.path);
          }
          itemClassBindings[i] = parsedPath;
        }

        viewOptions.classNameBindings = itemClassBindings;
      }

      hash.itemViewClass = itemViewClass;
      hash._itemViewProps = viewOptions;

      options.helperName = options.helperName || 'collection';

      return EmberHandlebars.helpers.view.call(this, collectionClass, options);
    }

    __exports__["default"] = collectionHelper;
  });
enifed("ember-handlebars/helpers/debug",
  ["ember-metal/core","ember-metal/utils","ember-metal/logger","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    /*jshint debug:true*/

    /**
    @module ember

