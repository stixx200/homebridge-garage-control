
const { EventEmitter } = require("events");
const { Gpio, gpioDirections, gpioEdges } = require("./gpioPort");

class DoorSensorPort extends EventEmitter {
    constructor(gpio, isNcSensor) {
		super();
		this.gpio = new Gpio(gpio, gpioDirections.in, gpioEdges.both);
		this.closedSensorValue = isNcSensor ? Gpio.LOW : Gpio.HIGH;
		this.isClosed = (this.gpio.getState() === this.closedSensorValue);

		this.handleStateChange = this.handleStateChange.bind(this);
		this.gpio.watch(this.handleStateChange);
	}

	handleStateChange(err, value) {
		if (err) {
			console.error(err);
			return;
		}
		const newIsClosed = (value === this.closedSensorValue);
		if (newIsClosed === this.isClosed) {
			return; // no change
		}

		this.isClosed = newIsClosed;
		this.emit("update", isClosed);
	}
}

module.exports = {
    DoorSensorPort,
};