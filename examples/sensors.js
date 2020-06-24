const WeDo = require("..");

const weDo = new WeDo.WeDo();

(async () => {

    weDo.connect();
    weDo.on("distance", (port, { distance }) => {
        console.log("Distance", port, distance);
    });
    weDo.on("tilt", (port, { tilt }) => {
        console.log("Tilt", port, tilt);
    });

})();
