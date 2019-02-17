'use strict';

const { GarageControl } = require('./src/garage-control');

const garageControl = new GarageControl({
    leftDoorCode: ['0', '0', '7', '*'],
    rightDoorCode: ['0', '0', '7', '#'],
    rowGpio: ['7', '8', '11', '25'],
    colGpio: ['9', '10', '24'],
    doorGpio: ['17', '27'],
    ledGpio: ['26', '19', '13'],
    buzzerGpio: '18',
    log: console.log,
});
garageControl.start();
