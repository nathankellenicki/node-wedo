import WeDo, { TiltEvent } from "../dist/index.js";

const hub = new WeDo();

(async () => {
    await hub.connect();
    hub.on("distance", ({ port, distance }) => {
        console.log("Distance", port, distance);
    });
    hub.on("tilt", ({ port, tilt }) => {
        console.log("Tilt", port, tilt);
    });
})();
