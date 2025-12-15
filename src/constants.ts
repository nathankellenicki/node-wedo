export const WEDO_VENDOR_ID = 0x0694;
export const WEDO_PRODUCT_ID = 0x0003;

export const SENSOR_MESSAGE_LENGTH = 8;
export const SENSOR_VALUE_OFFSETS = [2, 4];
export const SENSOR_TYPE_OFFSETS = [3, 5];

export const PORTS = ["A", "B"] as const;
export type PortId = (typeof PORTS)[number];

export const MAX_MOTOR_POWER = 127;
export const MOTOR_COMMAND_ID = 0x40;

export enum WeDoState {
  NotReady = 0,
  Ready = 1
}

export enum SensorType {
  Unknown = 0,
  Distance = 1,
  Tilt = 2
}

export enum TiltEvent {
  Level = 0,
  Front = 1,
  Back = 2,
  Left = 3,
  Right = 4,
  Unknown = 5
}

export interface SensorTypeRange {
  max: number;
  type?: SensorType;
}

/**
 * Mirrors the type detection thresholds used by the Linux WeDo driver.
 * Each `max` value represents the upper bound for the given identifier bucket.
 */
export const SENSOR_TYPE_RANGES: SensorTypeRange[] = [
  { max: 9 },
  { max: 27 },
  { max: 47, type: SensorType.Tilt },
  { max: 67 },
  { max: 87 },
  { max: 100 },
  { max: 109 },
  { max: 131 },
  { max: 152 },
  { max: 169 },
  { max: 190, type: SensorType.Distance },
  { max: 211 },
  { max: 224 },
  { max: 233 },
  { max: 246 },
  { max: 255 }
];

export const DISTANCE_SENSOR_RAW_MIN = 71;
export const DISTANCE_SENSOR_RAW_MAX = 219;
export const DISTANCE_SENSOR_MAX_VALUE = 100;

export interface TiltEventRange {
  max: number;
  event: TiltEvent;
}

export const TILT_EVENT_RANGES: TiltEventRange[] = [
  { max: 0, event: TiltEvent.Unknown },
  { max: 48, event: TiltEvent.Back },
  { max: 99, event: TiltEvent.Right },
  { max: 153, event: TiltEvent.Level },
  { max: 204, event: TiltEvent.Front },
  { max: 255, event: TiltEvent.Left }
];
