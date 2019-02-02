const pigpio = require('pigpio');
const { promisify } = require('util');
const freq = require("./frequencies");

const Gpio = pigpio.Gpio;
const delay = promisify(setTimeout);

const dutyCycle = 1000000 / 2; // 50% is max volume

class Buzzer {
    constructor(log, gpio) {
        if (!gpio) {
            throw new Error(`Buzzer GPIO configuration is wrong.`);
        }
        log(`Used GPIO pin for buzzer output is: '${gpio}'`);
        try {
            this.buzzer = new Gpio(+gpio, { mode: Gpio.OUTPUT });
        } catch (error) {
            log(`Can't create PWM output for buzzer. Try to run the program as root. Details: ${error.stack}`);
            this.buzzer = { hardwarePwmWrite: () => {} }; // fake implementation
        }
        this.enabled = true;
        this.currentJob = 0;
    }

    toggleEnabled() {
        this.enabled = !this.enabled;
    }

    async playSuccess() {
        const job = ++this.currentJob;
        await this.beep(freq.b, 200, job);
        await this.beep(freq.dH, 200, job);
        await this.beep(freq.fH, 200, job);
        await this.beep(freq.bH, 200, job);
        await this.beep(freq.dHH, 200, job);

        await delay(100);

        await this.beep(freq.dHH, 200, job);
        await delay(100);
        await this.beep(freq.dHH, 600, job);
        await delay(100);
    }

    async playFailure() {
        const job = ++this.currentJob;
        await this.beep(freq.dHH, 200, job);
        await delay(100);
        await this.beep(freq.dHH, 200, job);
        await delay(100);
        await this.beep(freq.dHH, 200, job);
        await delay(100);
    }

    async playImperialMarch() {
        const job = ++this.currentJob;
        await this.beep(freq.a, 500, job);
        await this.beep(freq.a, 500, job);
        await this.beep(freq.f, 350, job);
        await this.beep(freq.cH, 150, job);

        await this.beep(freq.a, 500, job);
        await this.beep(freq.f, 350, job);
        await this.beep(freq.cH, 150, job);
        await this.beep(freq.a, 1000, job);
        await this.beep(freq.eH, 500, job);

        await this.beep(freq.eH, 500, job);
        await this.beep(freq.eH, 500, job);
        await this.beep(freq.fH, 350, job);
        await this.beep(freq.cH, 150, job);
        await this.beep(freq.gS, 500, job);

        await this.beep(freq.f, 350, job);
        await this.beep(freq.cH, 150, job);
        await this.beep(freq.a, 1000, job);
        await this.beep(freq.aH, 500, job);
        await this.beep(freq.a, 350, job);

        await this.beep(freq.a, 150, job);
        await this.beep(freq.aH, 500, job);
        await this.beep(freq.gHS, 250, job);
        await this.beep(freq.gH, 250, job);
        await this.beep(freq.fHS, 125, job);

        await this.beep(freq.fH, 125, job);
        await this.beep(freq.fHS, 250, job);

        await delay(250);

        await this.beep(freq.aS, 250, job);
        await this.beep(freq.dHS, 500, job);
        await this.beep(freq.dH, 250, job);
        await this.beep(freq.cHS, 250, job);
        await this.beep(freq.cH, 125, job);

        await this.beep(freq.b, 125, job);
        await this.beep(freq.cH, 250, job);

        await delay(250);

        await this.beep(freq.f, 125, job);
        await this.beep(freq.gS, 500, job);
        await this.beep(freq.f, 375, job);
        await this.beep(freq.a, 125, job);
        await this.beep(freq.cH, 500, job);

        await this.beep(freq.a, 375, job);
        await this.beep(freq.cH, 125, job);
        await this.beep(freq.eH, 1000, job);
        await this.beep(freq.aH, 500, job);
        await this.beep(freq.a, 350, job);

        await this.beep(freq.a, 150, job);
        await this.beep(freq.aH, 500, job);
        await this.beep(freq.gHS, 250, job);
        await this.beep(freq.gH, 250, job);
        await this.beep(freq.fHS, 125, job);

        await this.beep(freq.fH, 125, job);
        await this.beep(freq.fHS, 250, job);

        await delay(250);

        await this.beep(freq.aS, 250, job);
        await this.beep(freq.dHS, 500, job);
        await this.beep(freq.dH, 250, job);
        await this.beep(freq.cHS, 250, job);
        await this.beep(freq.cH, 125, job);

        await this.beep(freq.b, 125, job);
        await this.beep(freq.cH, 250, job);

        await delay(250);

        await this.beep(freq.f, 250, job);
        await this.beep(freq.gS, 500, job);
        await this.beep(freq.f, 375, job);
        await this.beep(freq.cH, 125, job);
        await this.beep(freq.a, 500, job);

        await this.beep(freq.f, 375, job);
        await this.beep(freq.c, 125, job);
        await this.beep(freq.a, 1000, job);
    }

    async beep(freq, duration, job)
    {
        if (!this.enabled) { // if beep is not enabled, ignore it.
            return;
        }
        if (job && this.currentJob !== job) { // ignore beeps if next job is executing.
            return;
        }
        if (!job) { // mute further jobs if beep is called directly without playing a song.
            this.currentJob++;
        }

        this.buzzer.hardwarePwmWrite(freq, dutyCycle);
        await delay(duration);
        this.buzzer.digitalWrite(0);
        await delay(20); // a little delay between the several beeps
    }
}

module.exports = {
    Buzzer,
};
