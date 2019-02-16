'use strict';

const { fromEvent } = require('rxjs');
const { tap, debounceTime, map } = require('rxjs/operators');
const { EventEmitter } = require('events');
const _ = require('lodash');

class CombinationLock extends EventEmitter {
    constructor(keypad, codes) {
        super();
        this.keypad = keypad;
        this.setCodes(codes);

        this.start();
    }

    setCodes(codes) {
        _.forEach(codes, code => {
            this._verifyKeysAvailable(code);
        });
        this.codes = codes;
    }

    _verifyKeysAvailable(code) {
        if (_.difference(code, this.keypad.allKeys).length > 0) {
            throw new Error(
                `Given key combination is not available on keypad (${JSON.stringify(code)})`,
            );
        }
    }

    start() {
        let pressedKeys = [];
        this._subscription = fromEvent(this.keypad, 'pressed')
            .pipe(
                tap(key => {
                    pressedKeys.push(key);
                }),
                debounceTime(1000),
                map(() => _.find(this.codes, code => _.isEqual(pressedKeys, code))),
            )
            .subscribe(code => {
                this.emit('input', pressedKeys);
                pressedKeys = [];
                if (code) {
                    this.emit('unlocked', code);
                } else {
                    this.emit('failed');
                }
            });
    }

    stop() {
        this._subscription.unsubscribe();
    }
}

module.exports = {
    CombinationLock,
};
