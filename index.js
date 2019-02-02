"use strict";

const _ = require("lodash");
const { GarageControl } = require('./src/garage-control');

const LEFT_DOOR = "left";
const RIGHT_DOOR = "right";

module.exports = function (homebridge) {
    const { AccessoryInformation, GarageDoorOpener } = homebridge.hap.Service;
    const Characteristic = homebridge.hap.Characteristic;
    const { TargetDoorState, CurrentDoorState } = Characteristic;

    class GarageControlHomebridge {
        constructor(log, config) {
            this.log = log;
            this.name = config.name || "garage control accessory";
            this[LEFT_DOOR] = {
                currentDoorState: CurrentDoorState.CLOSED,
                targetDoorState: TargetDoorState.CLOSED,
                service: this.createDoorOpenerService(LEFT_DOOR),
            };
            this[RIGHT_DOOR] = {
                currentDoorState: CurrentDoorState.CLOSED,
                targetDoorState: TargetDoorState.CLOSED,
                service: this.createDoorOpenerService(RIGHT_DOOR),
            };

            // garage control
            this.garageControl = new GarageControl({ ...config, log: this.log });
            this.garageControl.start();

            // information service
            this.informationService = new AccessoryInformation();
            this.informationService
                .setCharacteristic(Characteristic.Manufacturer, "stixx200")
                .setCharacteristic(Characteristic.Model, "RPi Garage Control")
                .setCharacteristic(Characteristic.SerialNumber, "0");

            // if application gets closed, unregister GPIOs
            process.on("SIGINT", () => this.garageControl.stop());
        }

        identify(callback) {
            this.log("Identify requested!");
            callback(null);
        }

        getServices() {
            return [this.informationService, this[LEFT_DOOR].service, this[RIGHT_DOOR].service];
        }

        createDoorOpenerService(door) {
            const serviceName = this.getDoorName(door);
            const service = new GarageDoorOpener(serviceName, `${door}_garage_door`);
            service.setCharacteristic(TargetDoorState, TargetDoorState.CLOSED);
            service.setCharacteristic(CurrentDoorState, CurrentDoorState.CLOSED);
            service.getCharacteristic(TargetDoorState)
                .on("get", (callback) => { callback(null, this[door].targetDoorState) })
                .on("set", (value, callback) => {
                    this.setTargetDoorState(door, value);
                    callback();
                });
            service.getCharacteristic(Characteristic.Name)
                .on("get", (callback) => { callback(null, serviceName)})
            return service;
        }

        setTargetDoorState(door, targetDoorState) {
            this.log(`Set targetDoorState for door ${door} to '${targetDoorState}'`);
            this[door].targetDoorState = targetDoorState;
            this.openCloseDoor(door);
        }

        setCurrentDoorState(door, currentDoorState) {
            this.log(`Set currentDoorState for door ${door} to '${currentDoorState}'`);
            this[door].currentDoorState = currentDoorState;
            this[door].service.setCharacteristic(CurrentDoorState, currentDoorState);
        }

        openCloseDoor(door) {
            if (door === LEFT_DOOR) {
                this.garageControl.openLeftDoor();
            } else if (door === RIGHT_DOOR) {
                this.garageControl.openRightDoor();
            }
            // because we have no response when the door is closed/opened, wait 1 second and then assume the door has been closed/opened.
            setTimeout(() => this.setCurrentDoorState(this[door].targetDoorState), 1000);
        }

        getDoorName(door) {
            if (door === LEFT_DOOR) {
                return "linkes Garagentor";
            } else if (door === RIGHT_DOOR) {
                return "rechtes Garagentor";
            }
            return "unknown";
        }
    }

    homebridge.registerAccessory("homebridge-garage-control", "GarageControl", GarageControlHomebridge);
};
