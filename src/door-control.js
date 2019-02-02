"use strict";

const { Gpio } = require("onoff");

class DoorControl {
    constructor(log, doorGpio, doorOutDuration = 300) {
        if (!Array.isArray(doorGpio) || doorGpio.length !== 2) {
            throw new Error(`Door GPIO configuration is wrong. An array containing 2 strings is required! (${doorGpio})`);
        }
        log(`Used GPIO pins for door control are: 'left door: ${doorGpio[0]}' - 'right door: ${doorGpio[1]}'`);
        this.leftDoor = new Gpio(doorGpio[0], 'out');
        this.rightDoor = new Gpio(doorGpio[1], 'out');
        this.doorOutDuration = doorOutDuration;

        this.rightDoor.write(Gpio.LOW, () => {});
        this.leftDoor.write(Gpio.LOW, () => {});
    }

    stop() {
        this.rightDoor.unexport();
        this.leftDoor.unexport();
    }

    _activate(door) {
        door.write(Gpio.HIGH, () => {
            setTimeout(() => {
                door.write(Gpio.LOW, () => {});
            }, this.doorOutDuration);
        });
    }

    openRightDoor() {
        this._activate(this.rightDoor);
    }

    openLeftDoor() {
        this._activate(this.leftDoor);
    }
}

module.exports = {
    DoorControl,
};
