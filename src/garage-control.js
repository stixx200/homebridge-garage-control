"use strict";

const _ = require("lodash");
const { Keypad } = require('./keypad');
const { CombinationLock } = require('./combination-lock');
const { DoorControl } = require("./door-control");
const { LedOutput } = require("./led-output");
const { Buzzer } = require("./buzzer");

const wait = promisify(setTimeout);

class GarageControl {
    constructor(config = {}) {
        this.log = config.log || console.log;
        if (!Array.isArray(config.doors) || !Array.isArray(config.leftDoorCode)) {
            throw new Error('Can\'t create GarageControl without door configuration');
        }

        this.doors = _.map(config.doors, (config, index) => {
            if (!Array.isArray(config.code)) {
                throw new Error(`Configuration doesn't provide door code for door '${config.id}' (index ${index}).`);
            }
            this.log(`Door code for ${config.id}: ${config.code}`);
            const control = new DoorControl(config.id, this.log, config);
            control.on("update", isClosed => this.emit("doorStateChanged", control.id, isClosed));
            return {
                id: config.id,
                code: config.code,
                control,
                led: new LedOutput(config.id, this.log, config.ledGpio),
            }
        });
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

        const codes = _.concat([this.imperialMarchCode, this.toggleSoundCode], _.map(this.doors, "code"));
        this.lock = new CombinationLock(this.keypad, codes);

        this.failedLedOutput = new LedOutput(this.log, config.failedLedGpio);
        this.buzzer = new Buzzer(this.log, config.buzzerGpio);
    }

    start() {
        this.keypad.on('pressed', () => {
            this.buzzer.beep(440, 50);
        });

        this.lock.on('input', (keys) => {
            this.log(`input: ${JSON.stringify(keys)}`);
        });

        this.lock.on('failed', async () => {
            this.log("Failed to unlock");
            for (let i = 0; i < 4; ++i) {
                await this.failedLedOutput.activate(125);
                await wait(125);
            }
            this.buzzer.playFailure();
        });

        this.lock.on('unlocked', (code) => {
            const door = _.find(this.doors, (d) => _.isEqual(d.code, code));
            if (door) {
                this.openCloseDoor(door);
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

    async openCloseDoor(door) {
        this.log(`unlocked ${door.id} door`);
        await Promise.all([
            door.led.activate(),
            door.control.openCloseDoor(),
            this.buzzer.playSuccess(),
        ]);
    }

    async openCloseDoorById(doorId) {
        const door = _.find(this.doors, ["id", doorId]);
        if (!door) {
            throw new Error(`Can't open/close unknown door: ${doorId}`);
        }
        await this.openCloseDoor(door);
    }
}

module.exports = {
    GarageControl,
};
