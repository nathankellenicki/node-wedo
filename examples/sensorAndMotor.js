const WeDo = require("..");

const weDo = new WeDo.WeDo();

(async () => {

    weDo.connect();
    weDo.on("tilt", (port, { tilt }) => {
        if (tilt === WeDo.Consts.TiltEvent.FORWARD) {
            weDo.setPower("B", 100);
        } else if (tilt === WeDo.Consts.TiltEvent.BACK) {
            weDo.setPower("B", -100);
        } else if (tilt === WeDo.Consts.TiltEvent.NONE) {
            weDo.setPower("B", 0);
        }
    });

})();
