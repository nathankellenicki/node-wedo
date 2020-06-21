const WeDo = require("..").WeDo;

const weDo = new WeDo();

(async () => {

    weDo.connect();
    weDo.on("distance", (port, distance) => {
        console.log(port, distance);
    });

})();
