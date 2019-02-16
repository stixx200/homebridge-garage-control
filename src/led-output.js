'use strict';

const { Gpio, gpioDirections } = require('./gpioPort');
const { promisify } = require('util');

const wait = promisify(setTimeout);

class LedOutput {
    constructor(id, log, ledGpio) {
        if (!ledGpio) {
            throw new Error(`Led GPIO configuration is wrong (${ledGpio})`);
        }
        this.id = id;

        log(`Used GPIO pins for led output (${this.id}) is: '${ledGpio}'`);
        this.ledOut = new Gpio(ledGpio, gpioDirections.low);
    }

    async activate(duration) {
        await this.ledOut.writeAsync(Gpio.HIGH);
        await wait(duration);
        await this.ledOut.writeAsync(Gpio.LOW);
    }
}

module.exports = {
    LedOutput,
};
