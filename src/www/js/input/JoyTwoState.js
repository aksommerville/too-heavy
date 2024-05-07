/**
 * Tracks input devices and massages each into a set of two-state buttons.
 * We track the system keyboard as if it were a joystick.
 * No logical mapping. Just convert signed axes to two buttons, hats to four, etc.
 * We can serve as the canonical registry of devices too.
 */
export class JoyTwoState {
    constructor(bus) {
        this.bus = bus;
        this.nextId = 1;
        this.listeners = [];
        this.devices = [];
        this.bus.listen((1 << 1 /* egg.EventType.INPUT */) |
            (1 << 2 /* egg.EventType.CONNECT */) |
            (1 << 3 /* egg.EventType.DISCONNECT */) |
            (1 << 11 /* egg.EventType.KEY */) |
            0, e => this.onEvent(e));
        // If KEY events are available, we turn them on and expect them to remain on always.
        switch (egg.event_enable(11 /* egg.EventType.KEY */, 3 /* egg.EventState.ENABLED */)) {
            case 3 /* egg.EventState.ENABLED */:
            case 4 /* egg.EventState.REQUIRED */:
                {
                    this.devices.push({
                        devid: -1,
                        name: "System Keyboard",
                        vid: 0,
                        pid: 0,
                        version: 0,
                        mapping: 0,
                        buttons: [],
                        natural: new Set(),
                    });
                }
                break;
        }
    }
    listen(cb) {
        const id = this.nextId++;
        this.listeners.push({ id, cb });
        return id;
    }
    unlisten(id) {
        const p = this.listeners.findIndex(l => l.id === id);
        if (p >= 0) {
            this.listeners.splice(p, 1);
        }
    }
    onEvent(event) {
        switch (event.eventType) {
            case 1 /* egg.EventType.INPUT */:
                this.setButton(event.v0, event.v1, event.v2);
                break;
            case 2 /* egg.EventType.CONNECT */:
                this.onConnect(event.v0, event.v1);
                break;
            case 3 /* egg.EventType.DISCONNECT */:
                this.onDisconnect(event.v0);
                break;
            case 11 /* egg.EventType.KEY */:
                this.setButton(-1, event.v0, event.v1);
                break;
        }
    }
    onConnect(devid, mapping) {
        if (devid < 1)
            return;
        if (this.devices.find(d => d.devid === devid))
            return;
        const device = Object.assign(Object.assign({ devid: devid, name: egg.input_device_get_name(devid) }, egg.input_device_get_ids(devid)), { // vid,pid,version
            mapping, buttons: [], natural: new Set() });
        for (let p = 0;; p++) {
            const btn = egg.input_device_get_button(devid, p);
            if (!btn || !btn.btnid)
                break;
            const range = btn.hi - btn.lo + 1;
            if (range < 3)
                continue; // invalid or natural two-state
            if (range === 8) { // Assume hat.
                device.buttons.push({
                    btnid: btn.btnid,
                    hidusage: btn.hidusage,
                    method: 2 /* Joy2Method.HAT */,
                    srclo: btn.lo,
                    srchi: btn.hi,
                    values: [0, 0, 0, 0],
                });
            }
            else if (btn.lo === btn.value) { // Assume unsigned.
                device.buttons.push({
                    btnid: btn.btnid,
                    hidusage: btn.hidusage,
                    method: 0 /* Joy2Method.UNSIGNED */,
                    srclo: btn.lo + 1,
                    srchi: btn.hi,
                    values: [0],
                });
            }
            else { // Assume signed.
                const mid = (btn.lo + btn.hi) >> 1;
                let srclo = (mid + btn.lo) >> 1;
                let srchi = (mid + btn.hi) >> 1;
                if (srclo >= mid)
                    srclo = mid - 1;
                if (srchi <= mid)
                    srchi = mid + 1;
                device.buttons.push({
                    btnid: btn.btnid,
                    hidusage: btn.hidusage,
                    method: 1 /* Joy2Method.SIGNED */,
                    srclo,
                    srchi,
                    values: [0, 0],
                });
            }
        }
        this.devices.push(device);
    }
    onDisconnect(devid) {
        const p = this.devices.findIndex(d => d.devid === devid);
        if (p < 0)
            return;
        const device = this.devices[p];
        this.devices.splice(p, 1);
        for (const button of device.buttons) {
            switch (button.method) {
                case 0 /* Joy2Method.UNSIGNED */:
                    {
                        if (button.values[0])
                            this.buttonChanged(devid, button.btnid, "b", 0);
                    }
                    break;
                case 1 /* Joy2Method.SIGNED */:
                    {
                        if (button.values[0])
                            this.buttonChanged(devid, button.btnid, "lo", 0);
                        if (button.values[1])
                            this.buttonChanged(devid, button.btnid, "hi", 0);
                    }
                    break;
                case 2 /* Joy2Method.HAT */:
                    {
                        if (button.values[0])
                            this.buttonChanged(devid, button.btnid, "l", 0);
                        if (button.values[1])
                            this.buttonChanged(devid, button.btnid, "r", 0);
                        if (button.values[2])
                            this.buttonChanged(devid, button.btnid, "u", 0);
                        if (button.values[3])
                            this.buttonChanged(devid, button.btnid, "d", 0);
                    }
                    break;
            }
        }
        for (const btnid of Array.from(device.natural)) {
            this.buttonChanged(devid, btnid, "b", 0);
        }
    }
    setButton(devid, btnid, value) {
        const device = this.devices.find(d => d.devid === devid);
        if (!device)
            return;
        const button = device.buttons.find(b => b.btnid === btnid);
        if (button) {
            switch (button.method) {
                case 0 /* Joy2Method.UNSIGNED */:
                    {
                        if ((value >= button.srclo) && (value <= button.srchi)) {
                            if (button.values[0])
                                return;
                            button.values[0] = 1;
                            this.buttonChanged(devid, btnid, "b", 1);
                        }
                        else if (button.values[1]) {
                            button.values[1] = 0;
                            this.buttonChanged(devid, btnid, "b", 0);
                        }
                    }
                    break;
                case 1 /* Joy2Method.SIGNED */:
                    {
                        if (value <= button.srclo) {
                            if (!button.values[0]) {
                                button.values[0] = 1;
                                this.buttonChanged(devid, btnid, "lo", 1);
                            }
                        }
                        else if (button.values[0]) {
                            button.values[0] = 0;
                            this.buttonChanged(devid, btnid, "lo", 0);
                        }
                        if (value >= button.srchi) {
                            if (!button.values[1]) {
                                button.values[1] = 1;
                                this.buttonChanged(devid, btnid, "hi", 1);
                            }
                        }
                        else if (button.values[1]) {
                            button.values[1] = 0;
                            this.buttonChanged(devid, btnid, "hi", 0);
                        }
                    }
                    break;
                case 2 /* Joy2Method.HAT */:
                    {
                        value -= button.srclo;
                        let b0 = 0, b1 = 0, b2 = 0, b3 = 0;
                        switch (value) {
                            case 7:
                            case 6:
                            case 5:
                                b0 = 1;
                                break;
                            case 1:
                            case 2:
                            case 3:
                                b1 = 1;
                                break;
                        }
                        switch (value) {
                            case 7:
                            case 0:
                            case 1:
                                b2 = 1;
                                break;
                            case 5:
                            case 4:
                            case 3:
                                b3 = 1;
                                break;
                        }
                        if (button.values[0] !== b0) {
                            button.values[0] = b0;
                            this.buttonChanged(devid, btnid, "l", b0);
                        }
                        if (button.values[1] !== b1) {
                            button.values[1] = b1;
                            this.buttonChanged(devid, btnid, "r", b1);
                        }
                        if (button.values[2] !== b2) {
                            button.values[2] = b2;
                            this.buttonChanged(devid, btnid, "u", b2);
                        }
                        if (button.values[3] !== b3) {
                            button.values[3] = b3;
                            this.buttonChanged(devid, btnid, "d", b3);
                        }
                    }
                    break;
            }
        }
        else if (value) { // Natural two-state ON.
            if (!device.natural.has(btnid)) {
                device.natural.add(btnid);
                this.buttonChanged(devid, btnid, "b", 1);
            }
        }
        else { // Natural two-state OFF.
            if (device.natural.delete(btnid)) {
                this.buttonChanged(devid, btnid, "b", 0);
            }
        }
    }
    buttonChanged(devid, btnid, part, value) {
        for (const { cb } of this.listeners)
            cb(devid, btnid, part, value);
    }
}
