# node-wedo - A Javascript module to interface with LEGO WeDo (1.0).

### Installation

Node.js v8.0+ required.

`npm install node-wedo --save`

### Example

```js
const WeDo = require("node-wedo");

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
```

More examples available in the `examples` directory.