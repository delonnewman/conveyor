// jshint esversion: 6
const conveyor = require('../conveyor.js');

describe('conveyor#do', () => {
    it('should execute all the actions given sequentially', () => {
        var buffer = [];
        conveyor().do(
            () => buffer.push(1),
            () => buffer.push(2),
            () => {
                expect(buffer[0]).toBe(1);
                expect(buffer[1]).toBe(2);
            }
        );
    });
});
