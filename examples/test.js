const WeDo = require("..").WeDo;

const weDo1 = new WeDo("0fa08c695cee1d1ce410e31a5068bee154bc8728");
const weDo2 = new WeDo("624038db341dd5f0b18027beb417dac2dddacb16");

(async () => {

    weDo1.connect();
    weDo2.connect();
    weDo1.setPower("A", 100);
    await weDo1.sleep(3000);
    weDo2.setPower("B", 50);
    await weDo1.sleep(3000);
    weDo1.setPower("A", -50);

})();
