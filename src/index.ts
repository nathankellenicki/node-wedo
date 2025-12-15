import * as Consts from "./consts";
import { WeDo } from "./wedo";
import {
  WeDoState,
  SensorType,
  TiltEvent,
  PORTS,
  type PortId
} from "./constants";
import { WeDoConnection } from "./connection";

export default WeDo;
export { WeDo, Consts };
export type {
  DiscoverOptions,
  DistanceSensorPayload,
  TiltSensorPayload,
  WeDoEventMap,
  WeDoOptions,
  WeDoSensorPayload,
  WeDoDeviceInfo
} from "./wedo";
export { WeDoState, SensorType, TiltEvent, PORTS, type PortId };
export { WeDoConnection };

type WeDoModuleExport = typeof WeDo & {
  default?: typeof WeDo;
  __esModule?: boolean;
  WeDo: typeof WeDo;
  Consts: typeof Consts;
  WeDoState: typeof WeDoState;
  SensorType: typeof SensorType;
  TiltEvent: typeof TiltEvent;
  PORTS: typeof PORTS;
  WeDoConnection: typeof WeDoConnection;
};

const weDoModule = WeDo as WeDoModuleExport;

weDoModule.WeDo = WeDo;
weDoModule.Consts = Consts;
weDoModule.WeDoState = WeDoState;
weDoModule.SensorType = SensorType;
weDoModule.TiltEvent = TiltEvent;
weDoModule.PORTS = PORTS;
weDoModule.WeDoConnection = WeDoConnection;
weDoModule.default = WeDo;
weDoModule.__esModule = true;

if (typeof module !== "undefined" && module.exports) {
  module.exports = weDoModule;
}
