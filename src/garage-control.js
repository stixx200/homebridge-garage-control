'use strict';

const _ = require('lodash');
const { Keypad } = require('./keypad');
const { CombinationLock } = require('./combination-lock');
const { LedOutput } = require('./led-output');
const { Buzzer } = require('./buzzer');
const { DoorHandler } = require('./door-handler');

const wait = promisify(setTimeout);

class GarageControl {
    constructor(config = {}) {
        this.log = config.log || console.log;
        if (!Array.isArray(config.doors) || !Array.isArray(config.leftDoorCode)) {
            throw new Error("Can't create GarageControl without door configuration");
        }

        this.buzzer = new Buzzer(this.log, config.buzzerGpio);
        this.doors = _.map(
            config.doors,
            (config, index) => new DoorHandler(log, config, this.buzzer, index),
        );
        this.toggleSoundCode = ['*', '*', '*'];
        this.imperialMarchCode = ['1', '1', '3', '8']; // Star Wars Episode IV: A New Hope (1977): 1138 is the number of the cell block on the Death Star that Luke Skywalker claims to be transferring Chewbacca from.

        this.soundEnabled = true;
        this.keypad = new Keypad(
            [
                // prettier-ignore
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['*', '0', '#'],
            ],
            config.rowGpio,
            config.colGpio,
            this.log,
        );

        const codes = _.concat(
            [this.imperialMarchCode, this.toggleSoundCode],
            _.map(this.doors, 'code'),
        );
        this.lock = new CombinationLock(this.keypad, codes);

        this.failedLedOutput = new LedOutput(this.log, config.failedLedGpio);
    }

    start() {
        this.keypad.on('pressed', () => {
            this.buzzer.beep(440, 50);
        });

        this.lock.on('input', keys => {
            this.log(`input: ${JSON.stringify(keys)}`);
        });

        this.lock.on('failed', async () => {
            this.log('Failed to unlock');
            for (let i = 0; i < 4; ++i) {
                await this.failedLedOutput.activate(125);
                await wait(125);
            }
            this.buzzer.playFailure();
        });

        this.lock.on('unlocked', code => {
            const door = _.find(this.doors, d => _.isEqual(d.code, code));
            if (door) {
                door.openClose();
            } else if (_.isEqual(this.imperialMarchCode, code)) {
                this.buzzer.playImperialMarch();
            } else if (_.isEqual(this.toggleSoundCode, code)) {
                this.buzzer.toggleEnabled();
            } else {
                console.error(`Unknown code detected: '${JSON.stringify(code)}'`);
            }
        });

        this.log('Garage control running');
    }

    stop() {
        this.keypad.stop();
    }
}

module.exports = {
    GarageControl,
};
