//  Conveyor.js - Buffered and coordinated IO
//  =========================================
//
//  A conveyor instance guarantees that each action is executed sequentially.
//
//  Actions are simply functions that can optionally return a promise (any 'thenable' object)
//  if a promise is returned the next function will recieve the result of the promise as an
//  argument.
// 
//  ```
//  var IO = conveyor();
//  ```
//
//  For example:
//
//  ```
//  IO.do(
//     () => console.log("Hello"),
//     () => makeAnAjaxCall().then(() => console.log("Ajax Call Complete")),
//     () => console.log("Round trip is complete")
//  );
//  ```
// 
//  will give the output:
// 
//  ```
//  "Hello"
//  "Ajax Call Complete"
//  "Round trip is complete"
//  ```
// 
//  whereas,
// 
//  ```
//  console.log("Hello");
//  makeAnAjaxCall().then(() => console.log("Ajax Call Complete"));
//  console.log("Round trip is complete");
//  ```
// 
//  could give you:
// 
//  ```
//  "Hello"
//  "Round trip complete"
//  "Ajax Call Complete"
//  ```
(function () {
    "use strict";

    function toArray(value) {
        return Array.prototype.slice.call(value);
    }
    
    function isFunction(x) {
        return Object.prototype.toString.call(x) === '[object Function]';
    }

    function isUndefined(x) {
        return x === void(0);
    }
    
    // Instance Methods
    // ----------------

    function Conveyor (opts) {
        var ACTIONS = [];
        var BUFFER = [];
        var OPTIONS = opts || {};

        var PROMISE = null;
        var SELF = this;

        function handleError(msg) {
            if (isFunction(OPTIONS.error)) {
                OPTIONS.error.call();
            }
            else {
                console.error('Conveyor action failure', msg);
                throw msg;
            }
        }

        // conveyor#do
        // -----------
        //
        // Adds all the actions given as arguments to the conveyor
        this.do = function() {
            this.doAll(arguments);
        };

        // conveyor#doAll
        // --------------
        //
        // Adds an array of actions to the conveyor
        this.doAll = function(fns) {
            var i, fn;
            for (i = 0; i < fns.length; i++) {
                fn = fns[i];
                if (!isFunction(fn)) throw new Error('An action must be a function');
                if (ACTIONS.length > 5) {
                    BUFFER.push(fn);
                }
                else {
                    ACTIONS.push(fn);
                }
            }
            return this;
        };

        // conveyor#isComplete
        // -------------------
        //
        // Returns true if there are no more actions to process and the buffer is flushed
        this.isComplete = function() {
            return ACTIONS.length === 0 && BUFFER.length === 0;
        };

        function performAction(action) {
            console.log('performing action', action);
            if (PROMISE == null) {
                var res = action.call(SELF);
                if (!isUndefined(res)) {
                    return Promise.resolve(res);
                }
                return null;
            }
            else {
                return PROMISE.then(function() {
                    return action.apply(SELF, removeLastArgumentIfUndefined(arguments));
                }, handleError);
            }
        }

        function removeLastArgumentIfUndefined(args) {
            var args_ = toArray(args);
            if (isUndefined(args_[args_.length - 1])) {
                return args_.slice(0, args_.length - 1);
            }
            return args_;
        }

        setInterval(function() {
            if (ACTIONS.length === 0 && BUFFER.length !== 0) {
                ACTIONS.push(BUFFER.shift());
            }
        }, 1);

        setInterval(function() {
            while (ACTIONS.length !== 0) {
                PROMISE = performAction(ACTIONS.shift());
            }
        }, 2);
    }

    // isConveyor
    // ----------
    //
    // Returns true is the value given is a Conveyor instance, otherwise returns false.
    function isConveyor(x) {
        return x instanceof Conveyor;
    }

    // conveyor
    // --------
    //
    // Returns a new Conveyor instance
    function conveyor(opts) {
        return new Conveyor(opts);
    }

    // Action Builders & Combinators
    // -----------------------------

    // conveyor.asAction
    // -----------------
    //
    // Builds an action from a function and it's arguments
    //
    // *Example:*
    // ```
    // conveyor.asAction((name) => console.log('Hello ' + name), "Peter")()
    // // prints "Hello Peter"
    // ```
    conveyor.asAction = function(fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function() {
            return fn.apply(this, args);
        };
    };

    // conveyor.tap
    // ------------
    //
    // Returns an action that calls the given function (for-side effects), but returns
    // the argument that's been past to it.
    //
    // *Example:*
    // ```
    // IO.do(
    //     returnsOne,
    //     conveyor.tap((x) => console.log(x + 1)),
    //     getsOne
    // );
    // ```
    conveyor.tap = function(f) {
        return function(x) {
            f(x);
            return x;
        };
    };

    // conveyor.log
    // ------------
    //
    // Returns an action that will log it's input and return it for the next action.
    //
    // *Example:*
    // ```
    // conveyor.log("test")() // prints "test" at the console
    // ```
    conveyor.log = conveyor.tap(console.log.bind(console));

    // conveyor.doNothing
    // ------------------
    //
    // Is a no-op action. It takes no arguments, returns no value, and has no
    // side effects.
    conveyor.doNothing = function(){};

    // conveyor.doSimultaneously
    // -------------------------
    //
    // Returns an action that will execute the actions that it's given all at once.
    conveyor.doSimultaneously = function() {
        var actions = arguments;
        return function() {
            var i, action;
            for (i = 0; i < actions.length; i++) {
                action = actions[i];
                if (!_.isFunction(action)) throw new Error('Actions should be functions');
                action.apply(this, arguments);
            }
        };
    };

    function resolveThenable(thenable, action, self) {
        return Promise.resolve(thenable).then(function() {
            return action.apply(self, arguments);
        });
    }

    function collectPromiseAction(promise, ret, action, self) {
        return promise.then(function() {
            return resolveThenable(ret, action, self);
        });
    }

    // conveyor.doSequentially
    // -----------------------
    //
    // Returns an action that executes the given actions sequentially an returns a promise
    // that will ensure that any actions added to a conveyor after it will be executed sequentially.
    conveyor.doSequentially = function() {
        var actions = arguments;
        return function() {
            var promise, i, action, ret, args, self = this;
            for (i = 0; i < actions.length; i++) {
                action = actions[i];
                if (!_.isFunction(action)) throw new Error('Actions should be functions');
                if (ret == null) {
                    ret = action.apply(self, arguments);
                }
                else if (_.isFunction(ret.then) && promise == null) {
                    promise = resolveThenable(ret, action, self);
                }
                else if (_.isFunction(ret.then)) {
                    promise = collectPromiseAction(promise, ret, action, self);
                }
                else {
                    ret = action.apply(self, [ret]);
                }
            }
            return promise || Promise.resolve(ret);
        };
    };

    this.conveyor = conveyor;

    if (!isUndefined(module.exports)) {
        module.exports = conveyor;
    }

}.call(this));
