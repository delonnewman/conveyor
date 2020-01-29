// jshint esversion: 6
if (typeof module !== 'undefined') {
    var conveyor = require('../conveyor.js');
}

function nat(max) {
    return Math.floor(Math.random() * Math.floor(max || 10000));
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

describe('conveyor#do', () => {
    it('should execute all the actions given sequentially', () => {
        var io = conveyor().do(
            () => [1],
            conveyor.sleep(nat(100)),
            (nums) => nums + [2],
            conveyor.sleep(nat(100))
        );
        expectAsync(io).toBeResolvedTo([1, 2]);
    });
});

describe('conveyor#doAll', () => {
    it('should execute all the actions given sequentially', () => {
        var io = conveyor();
        io.doAll([
            () => [1],
            conveyor.sleep(nat(100)),
            (nums) => nums + [2],
            conveyor.sleep(nat(100))
        ]);
        expectAsync(io).toBeResolvedTo([1, 2]);
    });
});

describe('conveyor#isComplete', () => {
    it('should return true if it has been given no actions', () => {
        expect(conveyor().isComplete()).toBe(true);
    });

    it('should return false if there are still actions in the queue', () => {
        var io = conveyor();
        var acts = repeat(conveyor.sleep(nat(10000)), 20);
        io.doAll(acts);
        expect(io.isComplete()).toBe(false);
    });

    it('should return true after all actions have been performed', () => {
        
    });
});

describe('conveyor.return', () => {
    it('should return a promise whose value is the passed value', () => {
        var n = nat();
        expectAsync(conveyor.return(n)).toBeResolvedTo(n);

        var returnN = function() {
            return conveyor.return(n);
        };

        expectAsync(conveyor().do(returnN)).toBeResolvedTo(n);
    });
});

describe('conveyor.sleep', () => {
    it('should return an action that returns a promise that will sleep for ms milliseconds', () => {
        var t0 = new Date().valueOf();
        var n = nat();
        var io = conveyor().do(conveyor.sleep(n), () => new Date().valueOf() - t0);
        expectAsync(io).toBeResolvedTo(n);
    });
});

describe('conveyor.asAction', () => {
    it('should return an action bound to the given arguments', () => {
        var returnN = (n) => conveyor.return(n);
        var return10 = conveyor.asAction(returnN, 10);
        conveyor().do(
            return10,
            (n) => expect(n).toBe(10)
        );
    });
});

describe('conveyor.doSequentially', () => {
    it('should return an action that ensures that the given actions are performed sequentially', () => {
        var buffer = [];
        conveyor().do(
            conveyor.doSequentially(
                conveyor.sleep(nat()),
                () => buffer.push(1),
                conveyor.sleep(nat()),
                () => buffer.push(2),
                conveyor.sleep(nat()),
                () => buffer.push(3)
            ),
            conveyor.sleep(nat()),
            () => buffer.push(4),
            conveyor.tap(() => console.error('Buffer', buffer)),
            () => {
                console.log('Buffer', buffer);
                expect(buffer[0]).toBe(1);
                expect(buffer[1]).toBe(2);
                expect(buffer[2]).toBe(3);
                expect(buffer[3]).toBe(4);
            }
        );
    });
});

describe('conveyor.doSimultaneously', () => {
    it('should return an action that will fire off the given action all at once', () => {
        var buffer = [];
        conveyor().do(
            conveyor.doSimultaneously(
                conveyor.doSequentially(conveyor.sleep(nat()), () => buffer.push(1)),
                conveyor.doSequentially(conveyor.sleep(nat()), () => buffer.push(2)),
                conveyor.doSequentially(conveyor.sleep(nat()), () => buffer.push(3))
            ),
            () => buffer.push(4),
            conveyor.sleep(nat()),
            () => {
                expect(buffer).toEqual(jasmine.arrayContaining([4]));
            }
        );
    });
});
