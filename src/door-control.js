"use strict";

const { EventEmitter } = require("events");
const { promisifiy } = require("util");
const { Gpio, gpioDirections } = require("./gpioPort");
const { DoorSensorPort } = require("./doorSensorPort");

const wait = promisifiy(setTimeout);

const LEFT_DOOR = "left";
const RIGHT_DOOR = "right";

class DoorControl extends EventEmitter {
    constructor(log, doorGpio, doorOutDuration = 300) {
        if (!Array.isArray(doorGpio) || doorGpio.length !== 2) {
            throw new Error(`Door GPIO configuration is wrong. An array containing 2 strings is required! (${doorGpio})`);
        }
        this.onLeftSensorPortChanged = this.onLeftSensorPortChanged.bind(this);
        this.onRightSensorPortChanged = this.onRightSensorPortChanged.bind(this);
        this.log = log;
        this.log(`Used GPIO pins for door control are: 'left door: ${doorGpio[0]}' - 'right door: ${doorGpio[1]}'`);
        this.log(`Used GPIO pins for door sensors (isNcSensor: ${doorSensorGpio.isNcSensor}): 'left door: [opened: ${doorSensorGpio.left.opened}, closeed: ${doorSensorGpio.left.closed}]' - 'right door: [opened: ${doorSensorGpio.right.opened}, closeed ${doorSensorGpio.right.closed}]'`);

        this[LEFT_DOOR] = {
            engine: new Gpio(doorGpio[0], gpioDirections.low),
            openedSensor: new DoorSensorPort(doorSensorGpio.left.opened, doorSensorGpio.isNcSensor),
            closedSensor: new DoorSensorPort(doorSensorGpio.left.closed, doorSensorGpio.isNcSensor),
        };
        this[LEFT_DOOR].openedSensor.on("update", this.onLeftSensorPortChanged);
        this[LEFT_DOOR].closedSensor.on("update", this.onLeftSensorPortChanged);
        this[RIGHT_DOOR] = {
            engine: new Gpio(doorGpio[1], gpioDirections.low),
            openedSensor: new DoorSensorPort(doorSensorGpio.right.opened, doorSensorGpio.isNcSensor),
            closedSensor: new DoorSensorPort(doorSensorGpio.right.closed, doorSensorGpio.isNcSensor),
        };
        this[RIGHT_DOOR].openedSensor.on("update", this.onRightSensorPortChanged);
        this[RIGHT_DOOR].closedSensor.on("update", this.onRightSensorPortChanged);
        this.doorOutDuration = doorOutDuration;
    }

    async openCloseDoor(door, callback) {
        const oldClosedState = this.isDoorClosed(door);
        // send engine start event
        await door.writeAsync(Gpio.HIGH);
        await wait(this.doorOutDuration);
        await door.writeAsync(Gpio.LOW);
        // wait for correct sensor to be closed
        if (oldClosedState) {
            this[door].openedSensor.once("update", callback)
        } else {
            this[door].closedSensor.once("update", callback)
        }
    }

    onLeftSensorPortChanged() {
        this.emit("update", LEFT_DOOR, this.isClosed(LEFT_DOOR));
    }

    onRightSensorPortChanged() {
        this.emit("update", RIGHT_DOOR, this.isClosed(RIGHT_DOOR));
    }

    isDoorClosed(door) {
        const { openedSensor, closedSensor } = this[door];
        if (!openedSensor.isClosed && closedSensor.isClosed) {
            return true;
        }

        if (openedSensor.isClosed && closedSensor.isClosed) {
            this.log(`The sensors of ${identifier} door have detected incorrect state. Both sensors say they are closed. Assume door is opened.`);
        }
        return false;
    }
}

module.exports = {
    DoorControl,
    LEFT_DOOR,
    RIGHT_DOOR,
};
