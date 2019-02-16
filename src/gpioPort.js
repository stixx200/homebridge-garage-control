const { Gpio: OnOffGpio } = require('onoff');
const { promisify } = require('util');

const gpioReadAsync = promisify(Gpio.prototype.read);
const gpioWriteAsync = promisify(Gpio.prototype.write);

// 'high' and 'low' are variants of 'out' that configure the GPIO as an output with an initial level of 1 or 0 respectively.
const gpioDirections = {
    in: 'in',
    out: 'out',
    high: 'high',
    low: 'low',
};

const gpioEdges = {
    none: 'none',
    rising: 'rising',
    falling: 'falling',
    both: 'both',
};

class Gpio extends OnOffGpio {
    constructor(gpio, direction, edge) {
        super(gpio, direction, edge);

        process.on('SIGINT', () => {
            this.unexport();
        });
    }

    getState(retryCount) {
        retryCount = retryCount != null ? retryCount : 3;
        let val = 0;
        for (let i = 0; i < retryCount; i++) {
            val = this.readSync();
            if (val == Gpio.HIGH) {
                break;
            }
        }
        return val;
    }

    readAsync() {
        return gpioReadAsync.call(this);
    }

    writeAsync(state) {
        return gpioWriteAsync.call(this, state);
    }
}
Gpio.HIGH = OnOffGpio.HIGH;
Gpio.LOW = OnOffGpio.LOW;

module.exports = {
    Gpio,
    gpioDirections,
    gpioEdges,
};
