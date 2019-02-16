'use strict';

const { EventEmitter } = require('events');
const { promisifiy } = require('util');
const { Gpio, gpioDirections } = require('./gpioPort');
const { DoorSensorPort } = require('./doorSensorPort');

const wait = promisifiy(setTimeout);

class DoorControl extends EventEmitter {
    /**
     * Creates a new Door Control.
     * @param {string} id Id of the door control.
     * @param {function} log Log function to use.
     * @param {Object} config Configuration for door control.
     * @param {string} config.doorGpio Gpio port to use for door engine out.
     * @param {number} config.doorOutDuration Duration for HIGH level for engine out.
     * @param {string} config.openedSensorGpio Gpio port to use for opened door sensor.
     * @param {string} config.closedSensorGpio Gpio port to use for closed door sensor.
     * @param {boolean} config.isNcSensor True, if door sensors are nc sensors.
     * @param {number} config.maxTimeToWaitForDoorChanged Max timeout to wait for door change.
     */
    constructor(id, log, config) {
        this.onSensorPortChanged = this.onSensorPortChanged.bind(this);

        if (!config.doorGpio) {
            throw new Error(`${this.id}: GPIO port for door engine missing.`);
        }

        this.id = id;
        this.log = log;

        this.log(`Used GPIO pin for door control ${this.id} is: '${config.doorGpio}'`);
        this.log(
            `Used GPIO pins for door sensor (isNcSensor: ${config.isNcSensor}): '[opened: ${
                config.openedSensorGpio
            }, closed: ${config.closedSensorGpio}]'`,
        );

        this.maxTimeToWaitForDoorChanged = config.maxTimeToWaitForDoorChanged || 30000; // 30s default
        this.doorOutDuration = config.doorOutDuration || 300;
        this.engine = new Gpio(config.doorGpio, gpioDirections.low);

        if (config.openedSensorGpio) {
            this.openedSensor = new DoorSensorPort(config.openedSensorGpio, config.isNcSensor);
            this.closedSensor = new DoorSensorPort(config.closedSensorGpio, config.isNcSensor);
            this.openedSensor.on('update', this.onSensorPortChanged);
        }
    }

    async openCloseDoor() {
        const oldClosedState = this.isDoorClosed();
        // send engine start event
        await this.engine.writeAsync(Gpio.HIGH);
        await wait(this.doorOutDuration);
        await this.engine.writeAsync(Gpio.LOW);

        if (this.openedSensor) {
            // wait for correct sensor to be closed, but max. maxTimeToWaitForDoorChanged
            await Promise.race([
                wait(this.maxTimeToWaitForDoorChanged),
                new Promise(resolve => {
                    if (oldClosedState) {
                        this.openedSensor.once('update', resolve);
                    } else {
                        this.closedSensor.once('update', resolve);
                    }
                }),
            ]);
        } else {
            // no sensors available. Just call callback after maxTimeToWaitForDoorChanged
            await wait(this.maxTimeToWaitForDoorChanged);
        }
    }

    onSensorPortChanged() {
        this.emit('update', this.isClosed());
    }

    isDoorClosed() {
        if (this.openedSensor && !this.openedSensor.isClosed && this.closedSensor.isClosed) {
            return true;
        }

        if (this.openedSensor && this.openedSensor.isClosed && this.closedSensor.isClosed) {
            this.log(
                `The sensors of ${
                    this.id
                } door have detected incorrect state. Both sensors say they are closed. Assume door is opened.`,
            );
        }

        // if no sensor is available, the door is everytime closed
        // default is closed.
        return false;
    }
}

module.exports = {
    DoorControl,
};
