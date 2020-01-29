// jshint esversion: 6
if (typeof module !== 'undefined') {
    var conveyor = require('../conveyor.js');
}

function nat(max) {
    return Math.floor(Math.random() * Math.floor(max || 1000));
}

function pos(max) {
    return nat(max) + 1;
}

function neg(min) {
    return pos(min) * -1;
}

function zero() {
    return 0;
}

function sample(array) {
    return array[nat(array.length)];
}

function repeat(value, max) {
    var array = [], i;
    for (i = 0; i < max; i++) {
        array.push(value);
    }
    return array;
}

describe('conveyor#do', function() {
    it('should execute all the actions given sequentially', function() {
        var io = conveyor().do(
            () => [1],
            conveyor.sleep(nat(100)),
            (nums) => nums.concat([2]),
            conveyor.sleep(nat(100))
        );
        return expectAsync(io).toBeResolvedTo([1, 2]);
    });
});

describe('conveyor#doAll', function() {
    it('should execute all the actions given sequentially', function() {
        var io = conveyor();
        io.doAll([
            conveyor.always([1]),
            conveyor.sleep(nat(100)),
            (nums) => nums.concat([2]),
            conveyor.sleep(nat(100))
        ]);
        return expectAsync(io).toBeResolvedTo([1, 2]);
    });
});

describe('conveyor#isComplete', function() {
    it('should return true if it has been given no actions', function() {
        expect(conveyor().isComplete()).toBe(true);
    });

    it('should return false if there are still actions in the queue', function() {
        var io = conveyor();
        var acts = repeat(conveyor.sleep(nat(10)), 20);
        io.doAll(acts);
        expect(io.isComplete()).toBe(false);
    });

    it('should return true after all actions have been performed', function() {
        var io = conveyor();
        var acts = repeat(conveyor.sleep(nat(10)), 20);
        io.doAll(acts);
        return io.then(() => {
            return new Promise(resolve => {
                setTimeout(() => {
                    expect(io.isComplete()).toBe(true);
                    resolve();
                }, 1000);
            });
        });
    });
});

describe('conveyor.return', function() {
    it('should return a promise whose value is the passed value', function() {
        var n = nat();
        return expectAsync(conveyor.return(n)).toBeResolvedTo(n);
    });

    it('should work from within conveyor actions', function() {
        var n = nat();
        var returnN = function() {
            return conveyor.return(n);
        };

        return expectAsync(Promise.resolve(conveyor().do(returnN))).toBeResolvedTo(n);
    });
});

describe('conveyor.sleep', function() {
    it('should return an action that returns a promise that will sleep for ms milliseconds', function() {
        var t0 = new Date().valueOf();
        var n = nat();
        var io = conveyor({action_interval: 1, buffer_interval: 1}).do(conveyor.sleep(n), function() { return new Date().valueOf() - t0; });
        return io.then((dt) => {
            expect(dt).toBeGreaterThanOrEqual(n);
        });
    });
});

describe('conveyor.asAction', function() {
    it('should return an action bound to the given arguments', function() {
        var returnN = (n) => conveyor.return(n);
        var return10 = conveyor.asAction(returnN, 10);
        return expectAsync(conveyor().do(return10)).toBeResolvedTo(10);
    });
});

describe('conveyor.sequence', function() {
    it('should return an action that ensures that the given actions are performed sequentially', function() {
        var buffer = [];
        return conveyor().do(
            conveyor.sequence(
                conveyor.sleep(nat()),
                function() { buffer.push(1); },
                conveyor.sleep(nat()),
                function() { buffer.push(2); },
                conveyor.sleep(nat()),
                function() { buffer.push(3); }
            ),
            conveyor.sleep(nat()),
            function() { buffer.push(4); }
        ).then(
            function() {
                expect(buffer[0]).toBe(1);
                expect(buffer[1]).toBe(2);
                expect(buffer[2]).toBe(3);
                expect(buffer[3]).toBe(4);
            }
        );
    });
});
