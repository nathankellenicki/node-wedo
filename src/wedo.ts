import { EventEmitter} from "events";
import crypto from "crypto";

import HID from "node-hid";

import * as Consts from "./consts";

const VENDOR_ID = 0x0694;
const PRODUCT_ID = 0x0003;
const DISTANCE_SENSOR_IDS = [0xb0, 0xb1, 0xb2, 0xb3];
const TILT_SENSOR_IDS = [0x26, 0x27];


const MESSAGE_LENGTH = 8;
const MAX_POWER = 127;


export class WeDo extends EventEmitter {


    public state: Consts.State = Consts.State.NOT_READY;

    private _path: string | undefined;
    private _hidDevice: HID.HID | undefined;
    private _id: string;
    private _messageBuffer: Buffer = Buffer.alloc(0);

    private _sensorValues: number[] = new Array(2).fill(0);
    private _motorValues: number[] = new Array(2).fill(0);


    static discover () {
        return HID
            .devices()
            .filter((device) => device.vendorId === VENDOR_ID && device.productId === PRODUCT_ID)
            .map((device) => this._makeHubId(device));
    }


    static _makeHubId (device: HID.Device) {
        const shasum = crypto.createHash("sha1");
        shasum.update(device.path as string);
        return shasum.digest("hex");
    }


    constructor (id?: string) {
        super();
        const devices = HID
            .devices()
            .filter((device) => device.vendorId === VENDOR_ID && device.productId === PRODUCT_ID);
        let tempDevice;
        for (const device of devices) {
            const tempHubId = WeDo._makeHubId(device);
            if (!id || id === tempHubId) {
                tempDevice = device;
            }
        }
        if (!tempDevice) {
            throw new Error("No WeDo hub found");
        }
        this._id = WeDo._makeHubId(tempDevice);
        this._path = tempDevice.path;
    }


    get id () {
        return this._id;
    }


    public connect () {
        // @ts-ignore
        this._hidDevice = new HID.HID(this._path);
        this._hidDevice.on("data", this._handleIncomingData.bind(this));
    }


    public setPower (port: string, power: number) {
        if (!this._hidDevice) {
            throw new Error("WeDo hub not connected");
        }
        if (0 < power && power <= 100) {
            power = Math.floor(power * MAX_POWER / 100);
        }
        if (-100 <= power && power < 0) {
            power = Math.ceil(power * MAX_POWER / 100);
          }
        this._motorValues[port === "A" ? 0 : 1] = power;
        const message = [0x0, 0x40, this._motorValues[0] & 0xff, this._motorValues[1] & 0xff, 0x00, 0x00, 0x00, 0x00, 0x00];
            this._hidDevice.write(message);
    }


    public sleep (delay: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, delay);
        });
    }


    private _handleIncomingData (data?: Buffer) {
        if (data) {
            if (!this._messageBuffer) {
                this._messageBuffer = data;
            } else {
                this._messageBuffer = Buffer.concat([this._messageBuffer, data]);
            }
        }

        if (this._messageBuffer.length <= 0) {
            return;
        }


        if (this._messageBuffer.length >= MESSAGE_LENGTH) {
            const message = this._messageBuffer.slice(0, MESSAGE_LENGTH);
            this._messageBuffer = this._messageBuffer.slice(MESSAGE_LENGTH);
            this._parseMessage(message);
            if (this._messageBuffer.length > 0) {
                this._handleIncomingData();
            }
        }
    }


    private _parseMessage (message: Buffer) {
        this._parseSensorData(0, message[3], message[2]);
        this._parseSensorData(1, message[5], message[4]);
    }


    private _parseSensorData(port: number, type: number, data: number) {
        if (this._sensorValues[port] !== data) {
            this._sensorValues[port] = data;
            const portName = port === 0 ? "A" : "B";
            if (DISTANCE_SENSOR_IDS.indexOf(type) >= 0) {
                this.emit("distance", portName, data);
                return;
            }
            if (TILT_SENSOR_IDS.indexOf(type) >= 0) {
                if (10 <= data && data <= 40) {
                    this.emit("tilt", portName, Consts.TiltEvent.BACK);
                } else if (60 <= data && data <= 90) {
                    this.emit("tilt", portName, Consts.TiltEvent.RIGHT);
                } else if (170 <= data && data <= 190) {
                    this.emit("tilt", portName, Consts.TiltEvent.FORWARD);
                } else if (220 <= data && data <= 240) {
                    this.emit("tilt", portName, Consts.TiltEvent.LEFT);
                } else {
                    this.emit("tilt", portName, Consts.TiltEvent.NONE);
                }
                return;
            }
        }
    }

}
