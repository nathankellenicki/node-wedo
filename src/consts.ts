export enum State {
    NOT_READY = 0,
    READY = 1,
}

export enum TiltEvent {
    NONE = 0,
    FORWARD = 1,
    BACK = 2,
    LEFT = 3,
    RIGHT = 4,
}

export enum SensorType {
    UNKNOWN = 0,
    DISTANCE = 1,
    TILT = 2,
}
