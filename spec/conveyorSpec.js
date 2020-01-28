// jshint esversion: 6
const conveyor = require('../conveyor.js');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function nat(max) {
    var max = max || 1000;
    return Math.floor(Math.random() * Math.floor(max));
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
        var buffer = [];
        conveyor().do(
            () => buffer.push(1),
            () => sleep(nat(100)),
            () => buffer.push(2),
            () => sleep(nat(100)),
            () => {
                expect(buffer[0]).toBe(1);
                expect(buffer[1]).toBe(2);
            }
        );
    });
});

describe('conveyor#isComplete', () => {
    it('should return true if it has been given no actions', () => {
        expect(conveyor().isComplete()).toBe(true);
    });

    it('should return false if there are still actions in the queue', () => {
        var io = conveyor();
        var acts = repeat(() => sleep(nat(10000)), 20);
        io.doAll(acts);
        expect(io.isComplete()).toBe(false);
    });
});
