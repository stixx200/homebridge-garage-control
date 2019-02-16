'use strict';

const { Gpio, gpioDirections, gpioEdges } = require('./gpioPort');
const { EventEmitter } = require('events');
const _ = require('lodash');

class Keypad extends EventEmitter {
    constructor(keys, rows, cols, log, options = {}) {
        super();

        if (keys.length !== rows.length) {
            throw new Error(
                `Row configuration incorrect. Given ${
                    keys.length
                } keypad rows does not match the gpio rows ${JSON.stringify(rows)}`,
            );
        }
        if (!_.every(keys, ({ length }) => cols.length === length)) {
            throw new Error(
                `Col configuration incorrect. Given ${
                    keys[0].length
                } keypad cols does not match the gpio cols ${JSON.stringify(cols)}`,
            );
        }

        this.keys = keys;
        this.allKeys = _.flatten(this.keys);
        this.rows = rows.map(pin => new Gpio(pin, gpioDirections.out));
        this.cols = cols.map(pin => new Gpio(pin, gpioDirections.in, gpioEdges.both));
        this.currentlyPressedKeys = [];

        log(`Using keypad:\n #### ${this.keys.join('\n #### ')}\n`);
        log(`Using GPIO pins for the rows: ${rows}`);
        log(`Using GPIO pins for the cols: ${cols}`);

        this.config = {
            interval: options.interval || 100, // by default, check every 100ms for keys pressed
        };
        log(`Using poll interval for matrix keypad: ${this.config.interval}ms`);

        this._intervalHandle = null;
        this.checkRows = this.checkRows.bind(this);

        this.start();
    }

    start() {
        // set all rows to low.
        this.rows.forEach(rowPin => {
            rowPin.writeSync(Gpio.LOW);
        });

        this._intervalHandle = setInterval(this.checkRows, this.config.interval);
    }

    stop() {
        clearInterval(this._intervalHandle);
        this._intervalHandle = null;
    }

    checkRows() {
        const pressedKeys = [];
        this.rows.forEach((rowPin, rowIndex) => {
            rowPin.writeSync(Gpio.HIGH);
            this.cols.forEach((colPin, colIndex) => {
                if (colPin.readSync() === Gpio.HIGH) {
                    pressedKeys.push(this.keys[rowIndex][colIndex]);
                }
            });
            rowPin.writeSync(Gpio.LOW);
        });

        if (!_.isEqual(this.currentlyPressedKeys, pressedKeys)) {
            this.informAboutNewKeys(pressedKeys);
        }
        this.currentlyPressedKeys = pressedKeys;
    }

    informAboutNewKeys(allPressedKeys) {
        const releasedKeys = _.difference(this.currentlyPressedKeys, allPressedKeys);
        _.forEach(releasedKeys, key => {
            this.emit('released', key);
        });

        const pressedKeys = _.difference(allPressedKeys, this.currentlyPressedKeys);
        _.forEach(pressedKeys, key => {
            this.emit('pressed', key);
            this.emit(key);
        });

        this.emit('combination', allPressedKeys);
    }
}

module.exports = {
    Keypad,
};
