'use strict';

const { CombinationLock } = require('../combination-lock');
jest.mock('../keypad');
const { Keypad } = require('../keypad');

let keypad;
let testObject;

beforeEach(() => {
    keypad = new Keypad();
    keypad.allKeys = ['1', '5', '*'];
    testObject = new CombinationLock(keypad, [['1', '5', '*']]);
});

test('constructor throws if key combination is not available on keypad', () => {
    keypad.allKeys = ['2', '24'];
    expect(() => {
        new CombinationLock(keypad, [['2', '23', 'p']]);
    }).toThrowError('Given key combination is not available on keypad (["2","23","p"])');
});

test('constructor throws if key only one combination is not available on keypad', () => {
    keypad.allKeys = ['2', '24'];
    expect(() => {
        new CombinationLock(keypad, [['24', '2', '2'], ['2', '23', 'p']]);
    }).toThrowError('Given key combination is not available on keypad (["2","23","p"])');
});

test('combination lock emits correct unlock event', async () => {
    const mockCallback = jest.fn();
    testObject.on('unlocked', mockCallback);

    keypad.emit('pressed', '1');
    keypad.emit('pressed', '5');
    keypad.emit('pressed', '*');

    await new Promise(resolve => setTimeout(resolve, 1010));
    expect(mockCallback).toBeCalled();
});

test('combination lock emits correct failed event', async () => {
    const mockCallback = jest.fn();
    testObject.on('failed', mockCallback);

    keypad.emit('pressed', '8');
    keypad.emit('pressed', '7');
    keypad.emit('pressed', '6');

    await new Promise(resolve => setTimeout(resolve, 1010));
    expect(mockCallback).toBeCalled();
});
