"use strict";

const _ = require("lodash");
const { Keypad } = require('./keypad');
const { CombinationLock } = require('./combination-lock');
const { DoorControl, LEFT_DOOR, RIGHT_DOOR } = require("./door-control");
const { LedOutput } = require("./led-output");
const { Buzzer } = require("./buzzer");

class GarageControl {
    constructor(config = {}) {
        this.log = config.log || console.log;
        if (!Array.isArray(config.leftDoorCode) || !Array.isArray(config.leftDoorCode)) {
            throw new Error(`Configuration doesn't provide left and/or right door code (left: '${config.leftDoorCode}' right: '${config.rightDoorCode}').`);
        }
        this.leftDoorCode = config.leftDoorCode;
        this.log(`Left door code: ${this.leftDoorCode}`);
        this.rightDoorCode = config.rightDoorCode;
        this.log(`Right door code: ${this.rightDoorCode}`);
        this.toggleSoundCode = ["*", "*", "*"];
        this.imperialMarchCode = ["1", "1", "3", "8"]; // Star Wars Episode IV: A New Hope (1977): 1138 is the number of the cell block on the Death Star that Luke Skywalker claims to be transferring Chewbacca from.

        this.soundEnabled = true;
        this.keypad = new Keypad([
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['*', '0', '#']],
            config.rowGpio,
            config.colGpio,
            this.log);

        this.lock = new CombinationLock(this.keypad, [this.leftDoorCode, this.rightDoorCode, this.imperialMarchCode, this.toggleSoundCode]);

        this.doorControl = new DoorControl(this.log, config.doorGpio);
        this.ledOutput = new LedOutput(this.log, config.ledGpio);
        this.buzzer = new Buzzer(this.log, config.buzzerGpio);
    }

    start() {
        this.keypad.on('pressed', () => {
            this.buzzer.beep(440, 50);
        });

        this.lock.on('input', (keys) => {
            this.log(`input: ${JSON.stringify(keys)}`);
        });

        this.lock.on('failed', () => {
            this.log("Failed to unlock");
            this.ledOutput.activateFailedLED();
            this.buzzer.playFailure();
        });

        this.lock.on('unlocked', (code) => {
            if (_.isEqual(this.leftDoorCode, code)) {
                this.openLeftDoor();
            } else if (_.isEqual(this.rightDoorCode, code)) {
                this.openRightDoor();
            } else if (_.isEqual(this.imperialMarchCode, code)) {
                this.buzzer.playImperialMarch();
            } else if (_.isEqual(this.toggleSoundCode, code)) {
                this.buzzer.toggleEnabled();
            } else {
                console.error(`Unknown code detected: '${JSON.stringify(code)}'`);
            }
        });

        this.log("Garage control running");
    }

    stop() {
        this.keypad.stop();
    }

    openCloseDoor(door, callback) {
        this.log(`unlocked ${door} door`);
        if (door === LEFT_DOOR) {
            this.ledOutput.activateLeftLED();
        } else {
            this.ledOutput.activateRightLED();
        }
        this.buzzer.playSuccess();
        this.doorControl.openCloseDoor(door, callback);
    }
}

module.exports = {
    GarageControl,
};
