import WeDo, { TiltEvent } from "../dist/index.js";

const hub = new WeDo();

(async () => {
    await hub.connect({ highPower: true });
    console.log(hub.device);
    while (true) {
        hub.setPower("B", 100);
        await hub.sleep(2000);
        hub.setPower("B", 0);
        await hub.sleep(2000);
        hub.setPower("B", -100);
        await hub.sleep(2000);
        hub.setPower("B", 0);
        await hub.sleep(2000);
    }
})();
