import { EventEmitter } from "events";
import { createHash } from "crypto";
import HID from "node-hid";
import {
  DISTANCE_SENSOR_MAX_VALUE,
  DISTANCE_SENSOR_RAW_MAX,
  DISTANCE_SENSOR_RAW_MIN,
  MAX_MOTOR_POWER,
  PORTS,
  SensorType,
  TILT_EVENT_RANGES,
  TiltEvent,
  type PortId,
  WEDO_PRODUCT_ID,
  WEDO_VENDOR_ID,
  WeDoState
} from "./constants";
import { WeDoConnection } from "./connection";
import type { SensorNotification } from "./protocol";

export interface DiscoverOptions {
  vendorId?: number;
  productId?: number;
}

export interface WeDoOptions extends DiscoverOptions {
  id?: string;
  path?: string;
}

export interface WeDoDeviceInfo {
  id: string;
  path: string;
  productId: number;
  vendorId: number;
  product?: string;
  manufacturer?: string;
  serialNumber?: string;
}

interface BaseSensorPayload {
  port: PortId;
  rawValue: number;
}

export interface DistanceSensorPayload extends BaseSensorPayload {
  kind: "distance";
  distance: number;
}

export interface TiltSensorPayload extends BaseSensorPayload {
  kind: "tilt";
  tilt: TiltEvent;
}

export type WeDoSensorPayload = DistanceSensorPayload | TiltSensorPayload;

export interface WeDoEventMap {
  connected: (device: WeDoDeviceInfo) => void;
  disconnected: () => void;
  error: (error: Error) => void;
  notification: (payload: WeDoSensorPayload) => void;
  distance: (payload: DistanceSensorPayload) => void;
  tilt: (payload: TiltSensorPayload) => void;
}

type RequiredDiscoverOptions = Required<Pick<DiscoverOptions, "vendorId" | "productId">>;

export class WeDo extends EventEmitter {
  public state: WeDoState = WeDoState.NotReady;

  private readonly baseOptions: WeDoOptions;
  private connection?: WeDoConnection;
  private connectionHandlers?: {
    ready: () => void;
    disconnect: () => void;
    error: (error: Error) => void;
  };
  private readonly handleSensorNotificationBound: (notification: SensorNotification) => void;
  private lastSensorPayloads = new Map<string, WeDoSensorPayload>();
  private readonly motorValues: Record<PortId, number> = {
    A: 0,
    B: 0
  };
  private connectedDevice?: WeDoDeviceInfo;

  constructor(options: WeDoOptions = {}) {
    super();
    this.baseOptions = { ...options };
    this.handleSensorNotificationBound = (notification: SensorNotification) => {
      this.handleSensorNotification(notification);
    };
  }

  public override on<U extends keyof WeDoEventMap>(event: U, listener: WeDoEventMap[U]): this;
  public override on(event: string | symbol, listener: (...args: unknown[]) => void): this;
  public override on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  public override once<U extends keyof WeDoEventMap>(event: U, listener: WeDoEventMap[U]): this;
  public override once(event: string | symbol, listener: (...args: unknown[]) => void): this;
  public override once(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.once(event, listener);
  }

  public override emit<U extends keyof WeDoEventMap>(event: U, ...args: Parameters<WeDoEventMap[U]>): boolean;
  public override emit(event: string | symbol, ...args: unknown[]): boolean;
  public override emit(event: string | symbol, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  public get device(): WeDoDeviceInfo | undefined {
    return this.connectedDevice;
  }

  public async connect(options?: WeDoOptions): Promise<void> {
    if (this.connection) {
      throw new Error("WeDo connection already open");
    }
    const resolvedOptions = this.resolveOptions(options);
    const device = this.selectDevice(resolvedOptions);
    const connection = new WeDoConnection(device.path);
    this.attachConnection(connection, device);
    try {
      await connection.open();
    } catch (error) {
      this.detachConnection();
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    const connection = this.connection;
    if (!connection) {
      if (this.connectedDevice) {
        this.connectedDevice = undefined;
        this.state = WeDoState.NotReady;
        this.emit("disconnected");
      }
      return;
    }
    await connection.disconnect();
    if (this.connection === connection) {
      this.detachConnection();
      if (this.connectedDevice) {
        this.connectedDevice = undefined;
        this.emit("disconnected");
      }
      this.state = WeDoState.NotReady;
    }
  }

  public setPower(port: PortId | string, power: number): void {
    if (!this.connection || !this.connection.isReady) {
      throw new Error("WeDo hub not connected");
    }
    const portId = this.normalizePort(port);
    const rawPower = this.normalizePower(power);
    this.motorValues[portId] = rawPower;
    this.connection.sendMotorPower(this.motorValues.A, this.motorValues.B);
  }

  public sleep(delay: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  public static discover(options: DiscoverOptions = {}): WeDoDeviceInfo[] {
    const vendorId = options.vendorId ?? WEDO_VENDOR_ID;
    const productId = options.productId ?? WEDO_PRODUCT_ID;
    return HID.devices()
      .filter((device) => device.vendorId === vendorId && device.productId === productId && device.path)
      .map((device) => ({
        id: WeDo.makeDeviceId(device.path!),
        path: device.path!,
        productId: device.productId!,
        vendorId: device.vendorId!,
        product: device.product,
        manufacturer: device.manufacturer,
        serialNumber: device.serialNumber
      }));
  }

  public static makeDeviceId(path: string): string {
    const hash = createHash("sha1");
    hash.update(path);
    return hash.digest("hex");
  }

  private attachConnection(connection: WeDoConnection, device: WeDoDeviceInfo): void {
    const handleReady = () => {
      this.state = WeDoState.Ready;
      this.resetMotorValues();
      this.connectedDevice = device;
      this.lastSensorPayloads = new Map();
      this.emit("connected", device);
    };
    const handleDisconnect = () => {
      this.state = WeDoState.NotReady;
      this.resetMotorValues();
      this.connectedDevice = undefined;
      this.lastSensorPayloads = new Map();
      this.emit("disconnected");
      this.detachConnection();
    };
    const handleError = (error: Error) => {
      this.emit("error", error);
    };
    connection.once("ready", handleReady);
    connection.on("disconnect", handleDisconnect);
    connection.on("error", handleError);
    connection.on("notification", this.handleSensorNotificationBound);
    this.connectionHandlers = { ready: handleReady, disconnect: handleDisconnect, error: handleError };
    this.connection = connection;
  }

  private detachConnection(): void {
    if (!this.connection) {
      return;
    }
    if (this.connectionHandlers) {
      this.connection.removeListener("ready", this.connectionHandlers.ready);
      this.connection.removeListener("disconnect", this.connectionHandlers.disconnect);
      this.connection.removeListener("error", this.connectionHandlers.error);
      this.connectionHandlers = undefined;
    }
    this.connection.removeListener("notification", this.handleSensorNotificationBound);
    this.connection = undefined;
  }

  private handleSensorNotification(notification: SensorNotification): void {
    notification.samples.forEach((sample) => {
      switch (sample.sensorType) {
        case SensorType.Distance: {
          const distance = this.calculateDistance(sample.rawValue);
          const payload: DistanceSensorPayload = {
            kind: "distance",
            port: sample.port,
            rawValue: sample.rawValue,
            distance
          };
          this.emitSensorPayload(payload);
          break;
        }
        case SensorType.Tilt: {
          const tilt = this.calculateTiltEvent(sample.rawValue);
          const payload: TiltSensorPayload = {
            kind: "tilt",
            port: sample.port,
            rawValue: sample.rawValue,
            tilt
          };
          this.emitSensorPayload(payload);
          break;
        }
        default:
          break;
      }
    });
  }

  private normalizePort(port: PortId | string): PortId {
    const normalized = port.toString().trim().toUpperCase();
    const index = PORTS.indexOf(normalized as PortId);
    if (index === -1) {
      throw new Error(`Unknown WeDo port '${port}'`);
    }
    return PORTS[index];
  }

  private normalizePower(power: number): number {
    if (!Number.isFinite(power)) {
      return 0;
    }
    if (Math.abs(power) <= 100) {
      return Math.max(-MAX_MOTOR_POWER, Math.min(MAX_MOTOR_POWER, Math.round((power / 100) * MAX_MOTOR_POWER)));
    }
    return Math.max(-MAX_MOTOR_POWER, Math.min(MAX_MOTOR_POWER, Math.round(power)));
  }

  private calculateDistance(rawValue: number): number {
    const span = DISTANCE_SENSOR_RAW_MAX - DISTANCE_SENSOR_RAW_MIN;
    if (!Number.isFinite(rawValue) || span <= 0) {
      return 0;
    }
    const clamped = Math.max(DISTANCE_SENSOR_RAW_MIN, Math.min(DISTANCE_SENSOR_RAW_MAX, rawValue));
    const normalized = (clamped - DISTANCE_SENSOR_RAW_MIN) / span;
    return Math.round(normalized * DISTANCE_SENSOR_MAX_VALUE);
  }

  private calculateTiltEvent(value: number): TiltEvent {
    if (!Number.isFinite(value)) {
      return TiltEvent.Unknown;
    }
    for (const range of TILT_EVENT_RANGES) {
      if (value <= range.max) {
        return range.event;
      }
    }
    return TiltEvent.Unknown;
  }

  private emitSensorPayload(payload: WeDoSensorPayload): void {
    if (!this.shouldEmitPayload(payload)) {
      return;
    }
    this.emit("notification", payload);
    if (payload.kind === "distance") {
      this.emit("distance", payload);
    } else if (payload.kind === "tilt") {
      this.emit("tilt", payload);
    }
  }

  private shouldEmitPayload(payload: WeDoSensorPayload): boolean {
    const key = this.getPayloadKey(payload);
    const previous = this.lastSensorPayloads.get(key);
    if (previous && this.sensorPayloadsEqual(previous, payload)) {
      return false;
    }
    this.lastSensorPayloads.set(key, payload);
    return true;
  }

  private getPayloadKey(payload: WeDoSensorPayload): string {
    return `${payload.kind}:${payload.port}`;
  }

  private sensorPayloadsEqual(a: WeDoSensorPayload, b: WeDoSensorPayload): boolean {
    if (a.kind !== b.kind || a.port !== b.port) {
      return false;
    }
    switch (a.kind) {
      case "distance":
        return b.kind === "distance" && a.distance === b.distance;
      case "tilt":
        return b.kind === "tilt" && a.tilt === b.tilt;
      default:
        return false;
    }
  }

  private resolveOptions(overrides?: WeDoOptions): RequiredDiscoverOptions & WeDoOptions {
    return {
      vendorId: overrides?.vendorId ?? this.baseOptions.vendorId ?? WEDO_VENDOR_ID,
      productId: overrides?.productId ?? this.baseOptions.productId ?? WEDO_PRODUCT_ID,
      id: overrides?.id ?? this.baseOptions.id,
      path: overrides?.path ?? this.baseOptions.path
    };
  }

  private selectDevice(options: RequiredDiscoverOptions & WeDoOptions): WeDoDeviceInfo {
    const devices = WeDo.discover({
      vendorId: options.vendorId,
      productId: options.productId
    });
    if (options.path) {
      const device = devices.find((candidate) => candidate.path === options.path);
      if (device) {
        return device;
      }
      throw new Error(`No WeDo hub found at path '${options.path}'`);
    }
    if (options.id) {
      const device = devices.find((candidate) => candidate.id === options.id);
      if (device) {
        return device;
      }
      throw new Error(`No WeDo hub found with id '${options.id}'`);
    }
    if (devices.length === 0) {
      throw new Error("No WeDo hubs detected");
    }
    return devices[0];
  }

  private resetMotorValues(): void {
    this.motorValues.A = 0;
    this.motorValues.B = 0;
  }
}
