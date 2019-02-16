"use strict";

const { LEFT_DOOR, RIGHT_DOOR } = require("./src/door-control");
const initHomebridgeGarageDoorOpener = require("./src/homebridge/homebridgeGarageDoorOpener");

module.exports = function (homebridge) {
    const Service = homebridge.hap.Service,
    const Characteristic = homebridge.hap.Characteristic,
    const uuid = homebridge.hap.uuid,

    const HomebridgeGarageDoorOpener = initHomebridgeGarageDoorOpener(homebridge);

    class GarageControlHomebridge extends homebridge.hap.Accessory {
        constructor(log, config) {
            const name = config.name;
            const id = uuid.generate(`garagedoor.${config.id || name}`);
            super(name, id);

            this.name = name;
            this.log = log;

            // garage control
            this.garageControl = new GarageControl({ ...config, log: this.log });
            this.garageControl.start();

            // door services
            this.leftDoorService = new HomebridgeGarageDoorOpener(LEFT_DOOR, this.garageControl, this.getDoorName(door), this.log, config);
            this.rightDoorService = new HomebridgeGarageDoorOpener(RIGHT_DOOR, this.garageControl, this.getDoorName(door), this.log, config);

            // information service
            this.getService(Service.AccessoryInformation)
                .setCharacteristic(Characteristic.Manufacturer, "stixx200")
                .setCharacteristic(Characteristic.Model, "RPi Garage Control")
                .setCharacteristic(Characteristic.SerialNumber, "0");

            this.operationFinished = this.operationFinished.bind(this);
        }

        getServices() {
            return [...this.services, this.leftDoorService, this.rightDoorService];
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
