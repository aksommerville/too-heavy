import { JoyTwoState } from "./JoyTwoState";
import { JoyLogical } from "./JoyLogical";
import { JoyQuery } from "./JoyQuery";
/**
 * Global input manager and event bus.
 * Since we take control of the event loop, we also supply handling for network calls and timeouts.
 */
export class Bus {
    /*----- Setup. -----*/
    constructor() {
        this.nextId = 1;
        this.clock = 0;
        this.listeners = [];
        this.font = null;
        this.joyTwoState = new JoyTwoState(this);
        this.joyLogical = new JoyLogical(this);
        this.joyQuery = new JoyQuery(this);
        this.recentDevid = 1;
    }
    /**
     * If you supply a Font, JoyQuery and FakeKeyboard will both use it in preference to fontTilesheet.
     */
    setFont(font) {
        this.font = font;
    }
    /**
     * To enable high-level mapping of joystick events, you must tell us how many buttons and what to call them.
     *
     * Index in `names` corresponds little-endianly to bits in the player state.
     * You get to make these up.
     *
     * Index in `standardNames` corresponds to button indices in the Standard Mapping:
     *   [
     *     South, East, West, North,
     *     L1, R1, L2, R2,
     *     AuxLeft, AuxRight,
     *     LeftPlunger, RightPlunger,
     *     Up, Down, Left, Right,
     *     AuxCenter
     *   ]
     *
     * Use the same strings in both arrays, then we can map obvious things like the dpad without any help.
     */
    setButtonNames(names, standardNames) {
        this.joyLogical.setButtonNames(names, standardNames);
        this.joyQuery.setButtonNames(names, standardNames);
    }
    /**
     * Turn off all mapping features.
     */
    rawInputOnly() {
        this.joyLogical.enable(false);
    }
    /**
     * Begin mapping everything to logical player inputs.
     * I feel this is the appropriate mode for most games.
     * Text and pointer input will not be available.
     */
    requireJoysticks() {
        if (!this.joyLogical.canOperate())
            return false;
        this.joyLogical.enable(true);
        return true;
    }
    /**
     * Begin modal interactive configuration for one input device.
     * `devid` is -1 for the keyboard, or a positive connected devid.
     */
    beginJoyQuery(devid) {
        if (!this.joyQuery.begin(devid))
            return false;
        return true;
    }
    /**
     * Request a callback whenever the given events happen.
     * You may supply an event mask (`1 << egg.EventType`), or symbolic names.
     * Returns a positive ID that you can use to unlisten later.
     */
    listen(events, cb) {
        const mask = this.eventMaskFromAnything(events);
        if (!mask)
            return 0;
        const id = this.nextId++;
        this.listeners.push({ id, mask, cb });
        return id;
    }
    /**
     * Remove an event listener.
     */
    unlisten(id) {
        const listener = this.listeners.find(l => l.id === id);
        if (!listener)
            return;
        listener.id = 0;
        listener.cb = (event) => { };
    }
    eventMaskFromAnything(input) {
        switch (typeof (input)) {
            case "number": return input;
            case "string": {
                const t = this.evalEventType(input);
                if (!t)
                    return 0;
                if (t === 0x7fffffff)
                    return t;
                return 1 << t;
            }
            case "object":
                {
                    if (!input)
                        return 0;
                    if (input instanceof Array)
                        return input.reduce((a, v) => {
                            const t = this.evalEventType(v);
                            if (t)
                                return a | (1 << t);
                            return a;
                        }, 0);
                }
                break;
        }
        return 0;
    }
    evalEventType(input) {
        switch (input.toUpperCase()) {
            case "ALL": return 0x7fffffff;
            case "INPUT": return 1 /* egg.EventType.INPUT */;
            case "CONNECT": return 2 /* egg.EventType.CONNECT */;
            case "DISCONNECT": return 3 /* egg.EventType.DISCONNECT */;
            case "HTTP_RSP": return 4 /* egg.EventType.HTTP_RSP */;
            case "WS_CONNECT": return 5 /* egg.EventType.WS_CONNECT */;
            case "WS_DISCONNECT": return 6 /* egg.EventType.WS_DISCONNECT */;
            case "WS_MESSAGE": return 7 /* egg.EventType.WS_MESSAGE */;
            case "MMOTION": return 8 /* egg.EventType.MMOTION */;
            case "MBUTTON": return 9 /* egg.EventType.MBUTTON */;
            case "MWHEEL": return 10 /* egg.EventType.MWHEEL */;
            case "KEY": return 11 /* egg.EventType.KEY */;
            case "TEXT": return 12 /* egg.EventType.TEXT */;
            case "TOUCH": return 13 /* egg.EventType.TOUCH */;
            case "ACCELEROMETER": return 14 /* egg.EventType.ACCELEROMETER */;
        }
        return 0;
    }
    /*----- Event loop. -----*/
    /**
     * Call on each client update.
     */
    update(elapsed) {
        this.clock += elapsed;
        this.dropDefunctListeners();
        this.updatePlugins(elapsed);
        for (const event of egg.event_next())
            this.onEvent(event);
    }
    /**
     * Call at the end of each client render.
     * We might have plugins like a fake keyboard or pointer that expect to render above your content.
     */
    render() {
        this.renderPlugins();
    }
    /**
     * Normally only called from within Bus, but you can insert fake events too.
     */
    onEvent(event) {
        switch (event.eventType) {
            case 1: /* INPUT */ if (event.v2===1) switch (event.v1) {
                // A few Linux evdev keysyms, shoehorned in for Too Heavy, after deciding this version of Egg is not the go-forward.
                case 0x10001: egg.request_termination(); return; // Escape
                case 0x1003b: this.beginJoyQuery(this.recentDevid); return; // F1
                case 65835: egg.request_termination(); return; // RP on the My-Power gamepads, sorry for the ugly hacking
              } break;
            case 2: /* CONNECT */ this.recentDevid = event.v0; break;
            case 4 /* egg.EventType.HTTP_RSP */:
                this.onHttpResponse(event.v0, event.v1, event.v2);
                break;
            case 5 /* egg.EventType.WS_CONNECT */:
                this.onWsConnect(event.v0);
                break;
            case 6 /* egg.EventType.WS_DISCONNECT */:
                this.onWsDisconnect(event.v0);
                break;
            case 7 /* egg.EventType.WS_MESSAGE */:
                this.onWsMessage(event.v0, event.v1, event.v2);
                break;
        }
        const bit = 1 << event.eventType;
        for (const { cb, mask } of this.listeners) {
            if (!(mask & bit))
                continue;
            cb(event);
        }
    }
    /*----- Internals. Nothing public below this point. -----*/
    // To nullify any listener, set its ID zero and replace its callback.
    // In general, we'll reap the zero IDs here, rather than modifying arrays on the fly.
    dropDefunctListeners() {
        for (let i = this.listeners.length; i-- > 0;) {
            if (this.listeners[i].id)
                continue;
            this.listeners.splice(i, 1);
        }
    }
    updatePlugins(elapsed) {
        if (this.joyQuery.enabled)
            this.joyQuery.update(elapsed);
    }
    renderPlugins() {
        if (this.joyQuery.enabled)
            this.joyQuery.render();
    }
}
