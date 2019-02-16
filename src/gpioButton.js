const { EventEmitter } = require('events');
const { Gpio, gpioDirections, gpioEdges } = require('./gpioPort');

class GpioButton extends EventEmitter {
    constructor(gpio, isNcSensor) {
        super();
        this.gpio = new Gpio(
            gpio,
            gpioDirections.in,
            isNcSensor ? gpioEdges.falling : gpioEdges.rising,
        );

        this.handleStateChange = this.handleStateChange.bind(this);
        this.gpio.watch(this.handleStateChange);
    }

    handleStateChange(err, value) {
        if (err) {
            console.error(err);
            return;
        }
        this.emit('pushed');
    }
}

module.exports = {
    GpioButton,
};
