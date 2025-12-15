import WeDo, { TiltEvent } from "../dist/index.js";

const hub = new WeDo();

(async () => {
    await hub.connect();
    hub.on("tilt", ({ tilt }) => {
        if (tilt === TiltEvent.Forward) {
            hub.setPower("B", 100);
        } else if (tilt === TiltEvent.Back) {
            hub.setPower("B", -100);
        } else if (tilt === TiltEvent.None) {
            hub.setPower("B", 0);
        }
    });
})();
