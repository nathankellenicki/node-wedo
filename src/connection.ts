import { EventEmitter } from "events";
import HID from "node-hid";
import { SENSOR_MESSAGE_LENGTH, WeDoState } from "./constants";
import { MotorCommand, SensorNotification, createMotorCommand, decodeSensorNotification, encodeMotorCommand } from "./protocol";

export interface WeDoConnectionEventMap {
  ready: () => void;
  disconnect: () => void;
  error: (error: Error) => void;
  notification: (notification: SensorNotification) => void;
}

export class WeDoConnection extends EventEmitter {
  private device?: HID.HID;
  private buffer = Buffer.alloc(0);
  private state: WeDoState = WeDoState.NotReady;

  private readonly handleDataBound: (data: Buffer) => void;
  private readonly handleErrorBound: (error: Error) => void;

  constructor(private readonly path: string) {
    super();
    this.handleDataBound = (data: Buffer) => {
      this.handleIncomingData(data);
    };
    this.handleErrorBound = (error: Error) => {
      this.emit("error", error);
      this.cleanup(true);
    };
  }

  public override on<U extends keyof WeDoConnectionEventMap>(event: U, listener: WeDoConnectionEventMap[U]): this;
  public override on(event: string | symbol, listener: (...args: unknown[]) => void): this;
  public override on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  public override once<U extends keyof WeDoConnectionEventMap>(event: U, listener: WeDoConnectionEventMap[U]): this;
  public override once(event: string | symbol, listener: (...args: unknown[]) => void): this;
  public override once(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.once(event, listener);
  }

  public override emit<U extends keyof WeDoConnectionEventMap>(event: U, ...args: Parameters<WeDoConnectionEventMap[U]>): boolean;
  public override emit(event: string | symbol, ...args: unknown[]): boolean;
  public override emit(event: string | symbol, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  public async open(): Promise<void> {
    if (this.state === WeDoState.Ready && this.device) {
      return;
    }
    await this.openInternal();
  }

  public async disconnect(): Promise<void> {
    if (!this.device) {
      this.cleanup(false);
      return;
    }
    this.cleanup(true);
  }

  public sendMotorPower(motorA: number, motorB: number): void {
    if (!this.device || this.state !== WeDoState.Ready) {
      throw new Error("WeDo connection is not ready");
    }
    const command: MotorCommand = createMotorCommand(motorA, motorB);
    this.device.write(encodeMotorCommand(command));
  }

  public get isReady(): boolean {
    return this.state === WeDoState.Ready && !!this.device;
  }

  private async openInternal(): Promise<void> {
    this.buffer = Buffer.alloc(0);
    try {
      const device = new HID.HID(this.path);
      this.device = device;
      device.on("data", this.handleDataBound);
      device.on("error", this.handleErrorBound);
      this.state = WeDoState.Ready;
      this.emit("ready");
    } catch (error) {
      this.cleanup(false);
      throw error;
    }
  }

  private handleIncomingData(data?: Buffer): void {
    // console.log(data);
    if (data && data.length > 0) {
      this.buffer = Buffer.concat([this.buffer, data]);
    }
    while (this.buffer.length >= SENSOR_MESSAGE_LENGTH) {
      const message = this.buffer.slice(0, SENSOR_MESSAGE_LENGTH);
      this.buffer = this.buffer.slice(SENSOR_MESSAGE_LENGTH);
      const notification = decodeSensorNotification(message);
      if (!notification) {
        this.emit("error", new Error("Unable to decode sensor notification"));
        this.cleanup(true);
        return;
      }
      this.emit("notification", notification);
    }
  }

  private cleanup(emitDisconnect: boolean): void {
    if (this.device) {
      this.device.removeListener("data", this.handleDataBound);
      this.device.removeListener("error", this.handleErrorBound);
      try {
        this.device.close();
      } catch {
        // Ignore errors raised while closing an already disconnected device
      }
    }
    this.device = undefined;
    this.buffer = Buffer.alloc(0);
    this.state = WeDoState.NotReady;
    if (emitDisconnect) {
      this.emit("disconnect");
    }
  }
}
