/**
 *  Buffers and coordinates actions
 *  -------------------------------
 *  It guarantees that each action is sequentially executed. Actions are zero arity functions
 *  that can optionally return a promise (any 'thenable' object) if a promise is returned the
 *  next function can optionally accept the result of the previous action as an argument.
 * 
 *  var IO = new Conveyor();
 * 
 *  Example:
 *    ```
 *    IO.do(
 *      function() { console.log("Hello") },
 *      function() { return makeAnAjaxCall().then(function() { console.log("Ajax Call Complete") }) },
 *      function() { console.log("Round trip is complete") }
 *    );
 *    ```
 * 
 *    will give the output:
 * 
 *    ```
 *    "Hello"
 *    "Ajax Call Complete"
 *    "Round trip is complete"
 *    ```
 * 
 *    whereas,
 * 
 *    ```
 *    console.log("Hello");
 *    makeAnAjaxCall().then(function() { console.log("Ajax Call Complete") });
 *    console.log("Round trip is complete");
 *    ```
 * 
 *    could give you:
 * 
 *    ```
 *    "Hello"
 *    "Round trip complete"
 *    "Ajax Call Complete"
 *    ```
 */
(function ($, _) {
    "use strict";

    //
    // Utils
    //

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

        this.do = function() {
            this.doAll(arguments);
        };

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

        // flush buffer
        setInterval(function() {
            if (ACTIONS.length === 0 && BUFFER.length !== 0) {
                ACTIONS.push(BUFFER.shift());
            }
        }, 1);

        // execute actions
        setInterval(function() {
            while (ACTIONS.length !== 0) {
                PROMISE = performAction(ACTIONS.shift());
            }
        }, 2);
    }

    // Returns a new Conveyor instance
    function conveyor(opts) {
        return new Conveyor(opts);
    }

    // Builds an action from a function and it's arguments
    // Example:
    //   action(function(name) { console.log('Hello ' + name) }, "Peter")() => "Hello Peter"
    conveyor.asAction = function(fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function() {
            return fn.apply(this, args);
        };
    };

    // Returns an action that calls the given function (for-side effects), but returns
    // the argument that's been past to it.
    conveyor.tap = function(f) {
        return function(x) {
            f(x);
            return x;
        };
    };

    // Returns an action that will log it's input and return it for the next action.
    conveyor.log = tap(console.log.bind(console));

    // A no-op action.
    conveyor.doNothing = function(){};

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

    // Returns true is the value given is a Conveyor instance, otherwise returns false.
    function isConveyor(x) {
        return x instanceof Conveyor;
    }

    return conveyor;

}.call(this));
