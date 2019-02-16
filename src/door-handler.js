const { GpioButton } = require('./gpioButton');
const { DoorControl } = require('./door-control');

class DoorHandler {
    constructor(log, config, buzzer, index) {
        this.log = log;
        this.id = config.id;
        this.name = config.name || config.id;
        this.code = config.code;
        this.buzzer = buzzer;
        if (!Array.isArray(this.code)) {
            throw new Error(
                `Configuration doesn't provide door code for door '${this.id}' (index ${index}).`,
            );
        }
        this.log(`Door code for ${this.id}: ${this.code}`);
        this.control = new DoorControl(this.id, this.log, config);
        control.on('update', isClosed => this.emit('doorStateChanged', isClosed));

        if (config.buttonGpio) {
            this.button = new GpioButton(config.buttonGpio, false);
        }

        if (config.ledGpio) {
            this.led = new LedOutput(config.id, this.log, config.ledGpio);
        }
    }

    async openClose() {
        this.log(`unlocked ${this.id} door`);
        await Promise.all([
            this.led.activate(),
            this.control.openCloseDoor(),
            this.buzzer.playSuccess(),
        ]);
    }
}

module.exports = {
    DoorHandler,
};
