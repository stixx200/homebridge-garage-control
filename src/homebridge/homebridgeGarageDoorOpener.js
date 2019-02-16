function init(homebridge) {
    const { GarageDoorOpener } = homebridge.hap.Service;
    const { TargetDoorState, CurrentDoorState } = homebridge.hap.Characteristic;

    function asCurrentDoorState(targetState) {
        switch (targetState) {
            case TargetDoorState.OPEN:
                return CurrentDoorState.OPEN;
            case TargetDoorState.CLOSED:
                return CurrentDoorState.CLOSED;
        }
    }

    function asTargetDoorState(currentState) {
        switch (currentState) {
            case CurrentDoorState.OPEN:
                return TargetDoorState.OPEN;
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
        constructor(doorHandler, log, config) {
            const serviceName = doorHandler.name;
            super(serviceName, `${doorHandler.id}_garage_door`);
            this.doorHandler = doorHandler;
            this.log = log;
            this.config = config;
            this.isOperating = false;

            const state = this.readCurrentDoorState();
            this.onSetTargetDoorState = this.onSetTargetDoorState.bind(this);
            this.operationFinished = this.operationFinished.bind(this);
            this.onDoorStateChanged = this.onDoorStateChanged.bind(this);

            this.doorHandler.on('doorStateChanged', this.onDoorStateChanged);

            // TargetDoorState
            this.setCharacteristic(TargetDoorState, state);
            this.getCharacteristic(TargetDoorState).on('set', this.onSetTargetDoorState);

            // CurrentDoorState
            this.setCharacteristic(CurrentDoorState, state);
            this.getCharacteristic(CurrentDoorState).on('change', function({ newValue }) {
                this.log(`Garage Door state changed to ${newValue}`);
            });

            // Name
            this.getCharacteristic(Characteristic.Name).on('get', callback => {
                callback(null, serviceName);
            });

            this.refresh();
        }

        async onSetTargetDoorState(targetDoorState, callback) {
            const currentState = this.getCharacteristic(CurrentDoorState).value;
            if (
                currentState === CurrentDoorState.OPENING ||
                currentState === CurrentDoorState.CLOSING
            ) {
                callback(new Error('Must wait until operation is finished'));
                return;
            } else if (asCurrentDoorState(targetDoorState) == currentState) {
                // If the target state is equal to current state, do nothing.
                callback();
                return;
            }

            this.isOperating = true;
            this.log(`Door service ${this.doorHandler.id}: Started operation`);
            this.setCharacteristic(CurrentDoorState, asOperationState(state));
            await this.doorHandler.openClose();
            this.operationFinished();
            callback();
        }

        operationFinished() {
            this.isOperating = false;
            this.log(`Door service ${this.doorHandler.id}: Finished operation`);
            this.refresh();
        }

        onDoorStateChanged(isClosed) {
            const newDoorState = isClosed ? CurrentDoorState.CLOSED : CurrentDoorState.OPEN;
            this.getCharacteristic(CurrentDoorState).setValue(newDoorState);
        }

        refresh() {
            if (this.isOperating) {
                return;
            }
            const currentState = this.getCharacteristic(CurrentDoorState).value;
            const targetState = asTargetDoorState(currentState);
            this.log(`Refresh targetDoorState for door ${this.doorHandler.id} to '${targetState}'`);
            this.service.getCharacteristic(TargetDoorState).setValue(targetState);
        }

        readCurrentDoorState() {
            return this.doorHandler.isDoorClosed()
                ? CurrentDoorState.CLOSED
                : CurrentDoorState.OPENED;
        }
    }

    return HomebridgeGarageDoorOpener;
}

module.exports = init;
