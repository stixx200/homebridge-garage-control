
function init(homebridge) {
    const { GarageDoorOpener } = homebridge.hap.Service,
    const { TargetDoorState, CurrentDoorState } = homebridge.hap.Characteristic,

    function asCurrentDoorState(targetState) {
        switch (targetState) {
            case TargetDoorState.OPEN:
                return CurrentDoorState.OPEN;
            case TargetDoorState.CLOSED:
                return CurrentDoorState.CLOSED;
        }
    }

    function asOperationState(targetState) {
        switch (targetState) {
            case TargetDoorState.OPEN:
                return CurrentDoorState.OPENING;
            case TargetDoorState.CLOSED:
                return CurrentDoorState.CLOSING;
        }
    }

    class HomebridgeGarageDoorOpener extends GarageDoorOpener {
        constructor(doorId, garageControl, serviceName, log, config) {
            super(serviceName, `${doorId}_garage_door`);
            this.doorId = doorId;
            this.garageControl = garageControl;
            this.log = log;
            this.config = config;
            this.isOperating = false;

            const state = this.readCurrentDoorState();
            this.onSetTargetDoorState = this.onSetTargetDoorState.bind(this);
            this.operationFinished = this.operationFinished.bind(this);
            this.onDoorStateChanged = this.onDoorStateChanged.bind(this);

            this.garageControl.on("doorStateChanged", this.onDoorStateChanged);

            // TargetDoorState
            this.setCharacteristic(TargetDoorState, state);
            this.getCharacteristic(TargetDoorState).on("set", this.onSetTargetDoorState);

            // CurrentDoorState
            this.setCharacteristic(CurrentDoorState, state);
            this.getCharacteristic(CurrentDoorState)
                .on('change', function ({ newValue }) {
                    log(`Garage Door state changed to ${newValue}`);
                });

            // Name
            this.getCharacteristic(Characteristic.Name)
                .on("get", (callback) => { callback(null, serviceName)});

            this.refresh();
        }

        onSetTargetDoorState(targetDoorState, callback) {
            var currentState = this.getCharacteristic(CurrentDoorState).value;
			if (currentState === CurrentDoorState.OPENING || currentState === CurrentDoorState.CLOSING) {
                callback(new Error('Must wait until operation is finished'));
                return;
            } else if (asCurrentDoorState(targetDoorState) == currentState) { // If the target state is equal to current state, do nothing.
                callback();
                return;
            }

			this.isOperating = true;
            this.log.debug("Started operation");
            this.setCharacteristic(CurrentDoorState, asOperationState(state));
            this.garageControl.openCloseDoorById(this.doorId)
                .then(() => {
                    this.operationFinished();
                    callback();
                });
        }

        operationFinished() {
            this.isOperating = false;
            this.log.debug("Finished operation");
            this.refresh();
        }

        onDoorStateChanged(doorId, isClosed) {
            if (doorId !== this.doorId) {
                return;
            }
            this.getCharacteristic(CurrentDoorState)
			    .setValue(isClosed ? CurrentDoorState.CLOSED : CurrentDoorState.OPEN);
        }

        refresh() {
            if (this.isOperating) {
                return;
            }
            const currentState = this.getCharacteristic(CurrentDoorState).value;
            const targetState = (currentState == CurrentDoorState.OPEN) ? TargetDoorState.OPEN : TargetDoorState.CLOSED
            this.log(`Refresh targetDoorState for door ${this.doorId} to '${targetState}'`);
            this.service.getCharacteristic(TargetDoorState).setValue(targetState);
        }

        readCurrentDoorState() {
            return this.garageControl.doorControl.isDoorClosed(this.doorId) ? CurrentDoorState.CLOSED : CurrentDoorState.OPENED;
        }
    }

    return HomebridgeGarageDoorOpener;
}

module.exports = init;
