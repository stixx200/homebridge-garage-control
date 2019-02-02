"use strict";

const { Gpio } = require("onoff");
const { promisify } = require('util');

class LedOutput {
    constructor(log, ledGpio = ["26", "19", "13"]) {
        if (!Array.isArray(ledGpio) || ledGpio.length !== 3) {
            throw new Error(`Led GPIO configuration is wrong. An array containing 3 strings is required! (${ledGpio})`);
        }
        log(`Used GPIO pins for led output are: 'right: ${ledGpio[0]}' - 'failed: ${ledGpio[1]}' - 'left: ${ledGpio[2]}'`);
        this.leftDoorLED = new Gpio(ledGpio[0], 'out');
        this.failedLED = new Gpio(ledGpio[1], 'out');
        this.rightDoorLED = new Gpio(ledGpio[2], 'out');

        this.leftDoorLED.write(Gpio.LOW, () => {});
        this.failedLED.write(Gpio.LOW, () => {});
        this.rightDoorLED.write(Gpio.LOW, () => {});
    }

    stop() {
        this.leftDoorLED.unexport();
        this.failedLED.unexport();
        this.rightDoorLED.unexport();
    }

    async activateLeftLED() {
        await this._activateLED(this.leftDoorLED, 1000);
    }

    async activateFailedLED() {
        for (let i = 0; i < 4; ++i) {
            await this._activateLED(this.failedLED, 125);
            await promisify(setTimeout)(125);
        }
    }

    async activateRightLED() {
        await this._activateLED(this.rightDoorLED, 1000);
    }

    async _activateLED(led, duration) {
        await this.writeLedState(led, Gpio.HIGH);
        await promisify(setTimeout)(duration);
        await this.writeLedState(led, Gpio.LOW);
    }

    writeLedState(led, state) {
        return new Promise(resolve => led.write(state, resolve));
    }
}

module.exports = {
    LedOutput,
};
