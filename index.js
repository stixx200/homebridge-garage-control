"use strict";

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

            this.doorServices = _.map(this.garageControl.doors, (door) => {
                const doorName = door.name || door.id;
                return new HomebridgeGarageDoorOpener(door.id, this.garageControl, doorName, this.log, config);
            });

            // information service
            this.getService(Service.AccessoryInformation)
                .setCharacteristic(Characteristic.Manufacturer, "stixx200")
                .setCharacteristic(Characteristic.Model, "RPi Garage Control")
                .setCharacteristic(Characteristic.SerialNumber, "0");

            this.operationFinished = this.operationFinished.bind(this);
        }

        getServices() {
            return [...this.services, ...this.doorServices];
        }
    }

    homebridge.registerAccessory("homebridge-garage-control", "GarageControl", GarageControlHomebridge);
};
