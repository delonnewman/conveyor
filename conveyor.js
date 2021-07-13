//  Conveyor.js - Buffered and coordinated IO
//  =========================================
//
//  A conveyor instance guarantees that each action is executed sequentially.
//
//  Actions are simply functions that can optionally return a promise (any 'thenable' object)
//  if a promise is returned the next function will recieve the result of the promise as an
//  argument.
//
//  It's very simple, and has no dependencies. It can be used along side functional utility
//  libraries (e.g. [underscore.js][1], [lodash][2], [Ramda][3], etc.) and a
//  [virtual DOM implementation][4] for a purely functional style of develoment.
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
//
//  [1]: https://underscorejs.org/
//  [2]: https://lodash.com/
//  [3]: https://ramdajs.com/
//  [4]: https://www.npmjs.com/search?q=virtual%20dom
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
    
    function Conveyor (opts) {
        var ACTIONS = [];
        var BUFFER = [];
        var OPTIONS = opts || {};

        var ACTION_TTL = OPTIONS.action_interval || 2;
        var BUFFER_TTL = OPTIONS.buffer_interval || 1;

        var PROMISE = null;
        var SELF = this;

        function handleError(msg) {
            if (isFunction(OPTIONS.error)) {
                OPTIONS.error.call();
            }
            else {
                throw msg;
            }
        }

        // Instance Methods
        // ----------------

        // conveyor#do(...actions) => Conveyor
        // -----------------------------------
        //
        // Adds all the actions given as arguments to the conveyor
        this.do = function() {
            return this.doAll(arguments);
        };

        // conveyor#doAll(actions) => Conveyor
        // -----------------------------------
        //
        // Adds an array of actions to the conveyor
        this.doAll = function(fns) {
            var i, fn;
            for (i = 0; i < fns.length; i++) {
                fn = fns[i];
                if (!isFunction(fn)) {
                    throw new Error('An action must be a function');
                }
                if (ACTIONS.length > 5) {
                    BUFFER.push(fn);
                }
                else {
                    ACTIONS.push(fn);
                }
            }
            return this;
        };

        // conveyor#isComplete() => Boolean
        // --------------------------------
        //
        // Returns true if there are no more actions to process and the buffer is flushed
        this.isComplete = function() {
            return ACTIONS.length === 0 && BUFFER.length === 0;
        };

        // conveyor#then(resolve, reject) => Promise
        // -----------------------------------------
        //
        // Implements the 'thenable' interface so a conveyor can be treated as a promise.
        this.then = function(resolve, reject) {
            if (PROMISE == null) {
                return new Promise(function(resolve1, reject) {
                    SELF.do(resolve, resolve1);
                });
            }
            else {
                return PROMISE.then(resolve, reject);
            }
        };

        function performAction(action) {
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
        }, BUFFER_TTL);

        setInterval(function() {
            while (ACTIONS.length !== 0) {
                PROMISE = performAction(ACTIONS.shift());
            }
        }, ACTION_TTL);
    }

    // Extensions
    // ----------

    Conveyor.prototype = Object.create(null);

    // conveyor#log(...arguments) => Conveyor
    // --------------------------------------
    //
    // Queues an action prints it's first argument to the console.
    Conveyor.prototype.log = function() {
        return this.do(conveyor.say.apply(conveyor, arguments));
    };

    // Predicates
    // ----------

    // isConveyor(x) => Boolean
    // ------------------------
    //
    // Returns true is the value given is a Conveyor instance, otherwise returns false.
    function isConveyor(x) {
        return x instanceof Conveyor;
    }

    // Constructors
    // ------------

    // conveyor([opts])
    // ----------------
    //
    // Returns a new Conveyor instance
    function conveyor(opts) {
        return new Conveyor(opts);
    }

    // Action Builders & Combinators
    // -----------------------------

    // conveyor.asAction(fn, ...arguments)()
    // -------------------------------------
    //
    // Builds an action from a function and it's arguments
    //
    // *Example:*
    // ```js
    // conveyor.asAction((name) => console.log('Hello ' + name), "Peter")()
    // // prints "Hello Peter"
    // ```
    conveyor.asAction = function(fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function() {
            return fn.apply(this, args);
        };
    };

    // conveyor.none
    // -------------
    //
    // Is a no-op action. It takes no arguments, returns no value, and has no
    // side effects.
    conveyor.none = function(){};

    // conveyor.tap(fn)(x) => Promise(x)
    // ---------------------------------------
    //
    // Returns an action that calls the given function (for-side effects), but returns
    // the argument that's been past to it.
    //
    // *Example:*
    // ```js
    // IO.do(
    //     returnsOne,
    //     conveyor.tap((x) => console.log(x + 1)),
    //     getsOne
    // );
    // ```
    conveyor.tap = function(f) {
        return function(x) {
            f(x);
            return conveyor.return(x);
        };
    };

    // conveyor.always(x)() => Promise(x)
    // ----------------------------------
    //
    // Returns an action that always returns the given value.
    //
    // *Example:*
    // ```
    // var one = conveyor.always(1);
    // IO.do(one, conveyor.log, one, conveyor.log);
    // // prints 1 1 to the console.
    // ```
    conveyor.always = function(x) {
        return function() {
            return conveyor.return(x);
        };
    };

    // conveyor.ident()(x) => Promise(x)
    // ---------------------------------
    //
    // Returns an action that returns the first argument that is given to it.
    //
    // *Example:*
    // ```
    // IO.do(conveyor.always(1), conveyor.ident, conveyor.log)
    // // prints 1 to the console
    // ```
    conveyor.ident = function() {
        return function(x) {
            return conveyor.return(x);
        };
    };

    // conveyor.log(...arguements)(x) => Promise(x)
    // --------------------------------------------
    //
    // Returns an action that will log it's input and return it for the next action.
    //
    // *Example:*
    // ```js
    // IO.do(conveyor.always('test'), conveyor.log, conveyor.log);
    // // prints 'test' 'test' to the console.
    // ```
    conveyor.log = function() {
        return function(x) {
            console.log.apply(console, arguments);
            return conveyor.return(x);
        };
    };

    // conveyor.say(...arguments)(x) => Promise(x)
    // -------------------------------------------
    //
    // Returns an action that will print the given message to the console. It' will also pass along
    // it's first argument for the next action.
    //
    // *Example:*
    // ```js
    // IO.do(conveyor.say('test'), conveyor.say('test'));
    // // prints 'test' 'test' to the console.
    // ```
    conveyor.say = function(msg) {
        var args = arguments;
        return function(x) {
            console.log.apply(console, args);
            return conveyor.return(x);
        };
    };

    // conveyor.sleep(ms)() => Promise
    // -------------------------------
    //
    // Returns an action that returns a promise that sleeps for ms milliseconds.
    conveyor.sleep = function(ms) {
        return function() {
            var args = arguments;
            return new Promise(function(resolve) {
                var self = this;
                setTimeout(function() {
                    resolve.apply(self, args);
                }, ms);
            });
        };
    };

    // conveyor.throw(error)()
    // -----------------------
    //
    // Returns an action that throws an exception.
    conveyor.throw = function(e) {
        return function() {
            throw e;
        };
    };

    // conveyor.return(x) => Promise(x)
    // --------------------------------
    //
    // Is a synonym for `Promise.resolve`. It's a way of explicitly returning a value to
    // the next action.
    conveyor.return = Promise.resolve.bind(Promise);

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

    conveyor.doSequentially = function(actions) {
        var promise, i, action, ret, args, self = this;
        for (i = 0; i < actions.length; i++) {
            action = actions[i];
            if (!isFunction(action)) throw new Error('Actions should be functions');
            if (ret == null) {
                ret = action.apply(self, arguments);
            }
            else if (isFunction(ret.then) && promise == null) {
                promise = resolveThenable(ret, action, self);
            }
            else if (isFunction(ret.then)) {
                promise = collectPromiseAction(promise, ret, action, self);
            }
            else {
                ret = action.apply(self, [ret]);
            }
        }
        return promise || Promise.resolve(ret);
    };

    // conveyor.sequence(...actions)() => Promise
    // ------------------------------------------
    //
    // Returns an action that executes the given actions sequentially an returns a promise
    // that will ensure that any actions added to a conveyor after it will be executed sequentially.
    conveyor.sequence = function() {
        var actions = arguments;
        return function() {
            return conveyor.doSequentially(actions);
        };
    };

    // conveyor.when(predicate, ...actions)(x) => Promise(x)
    // -----------------------------------------------------
    //
    // Returns an action that executes `actions` only if `predicate` is not `null`, `undefined` or
    // `false`.
    conveyor.when = function(predicate) {
        var actions = Array.prototype.slice.call(arguments, 1);
        return function(x) {
            var y = predicate(x);
            if (y != null && y != false) {
                return conveyor.doSequentially(actions);
            }
            return conveyor.return(x);
        };
    };

    // conveyor.unless(predicate, ...actions)(x) => Promise(x)
    // -------------------------------------------------------
    //
    // Returns an action that executes `actions` only if `predicate` is `null`, `undefined` or
    // `false`.
    conveyor.unless = function(predicate) {
        var actions = Array.prototype.slice.call(arguments, 1);
        return function(x) {
            var y = predicate(x);
            if (y == null || y == false) {
                return conveyor.doSequentially(actions);
            }
            return conveyor.return(x);
        };
    };

    this.conveyor = conveyor;

    // The contructor is available for extension
    conveyor.Conveyor = Conveyor;

    if (typeof module !== 'undefined') {
        module.exports = conveyor;
    }

}.call(this));
