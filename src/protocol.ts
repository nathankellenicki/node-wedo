import {
  PORTS,
  SENSOR_MESSAGE_LENGTH,
  SENSOR_TYPE_RANGES,
  SENSOR_TYPE_OFFSETS,
  SENSOR_VALUE_OFFSETS,
  SensorType,
  type PortId
} from "./constants";

export enum MessageType {
  MotorCommand = 1,
  SensorNotification = 2
}

export interface MotorCommand {
  id: MessageType.MotorCommand;
  outputBits: number;
  motorA: number;
  motorB: number;
}

export interface SensorSample {
  port: PortId;
  rawValue: number;
  sensorType: SensorType;
  sensorTypeId: number;
}

export interface SensorNotification {
  id: MessageType.SensorNotification;
  raw: Buffer;
  samples: SensorSample[];
}

export function createMotorCommand(outputBits: number, motorA: number, motorB: number): MotorCommand {
  return {
    id: MessageType.MotorCommand,
    outputBits,
    motorA,
    motorB
  };
}

export function encodeMotorCommand(command: MotorCommand): number[] {
  const message = Buffer.alloc(9, 0x00);
  message[0] = 0x00; // HID Report ID
  message[1] = command.outputBits & 0xff;
  message[2] = command.motorA & 0xff;
  message[3] = command.motorB & 0xff;
  return Array.from(message);
}

export function decodeSensorNotification(message: Buffer): SensorNotification | null {
  if (message.length < SENSOR_MESSAGE_LENGTH) {
    return null;
  }
  const samples: SensorSample[] = [];
  for (let index = 0; index < PORTS.length; index += 1) {
    const rawValue = message[SENSOR_VALUE_OFFSETS[index]];
    const sensorTypeId = message[SENSOR_TYPE_OFFSETS[index]];
    samples.push({
      port: PORTS[index],
      rawValue,
      sensorTypeId,
      sensorType: getSensorType(sensorTypeId)
    });
  }
  return {
    id: MessageType.SensorNotification,
    raw: message.slice(0, SENSOR_MESSAGE_LENGTH),
    samples
  };
}

function getSensorType(sensorTypeId: number): SensorType {
  for (const range of SENSOR_TYPE_RANGES) {
    if (sensorTypeId <= range.max) {
      return range.type ?? SensorType.Unknown;
    }
  }
  return SensorType.Unknown;
}
