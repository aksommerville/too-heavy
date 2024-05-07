const TIMEOUT = 10; // seconds
const TIMEOUT_VISIBLE = 6; // How many seconds will we show the clock? <10
export class JoyQuery {
    constructor(bus) {
        this.bus = bus;
        this.enabled = false;
        this.twoStateListener = 0;
        this.buttonNames = [];
        this.standardNames = [];
        this.prompts = [
            "Fault! Please press %.",
            "Please press %.",
            "Press % again.",
        ];
        this.labelTexid = 0;
        this.labelw = 0;
        this.labelh = 0;
        this.labelMessage = "";
        this.texid = 0;
        this.glyphw = 0;
        this.glyphh = 0;
        this.state = 0 /* JoyQueryState.NONE */;
        this.buttonp = 0;
        this.device = null;
        this.screenw = 0;
        this.screenh = 0;
        this.timeout = 0;
        this.tiles = null;
        this.srcbtnid = 0;
        this.srcpart = 'b';
        this.changes = [];
        const fb = egg.texture_get_header(1);
        this.screenw = fb.w;
        this.screenh = fb.h;
    }
    /**
     * Provide the verbiage for our prompts.
     * Must be an array of three strings, where '%' is replaced by the button name.
     * We supply defaults in English.
     *  - [0] Initial prompt, after receiving invalid input. "Fault! Please press %."
     *  - [1] Initial prompt, normal case. "Please press %."
     *  - [2] Secondary prompt, asking user to press it again. "Press % again."
     */
    setPrompts(prompts) {
        this.prompts = prompts;
    }
    setFontTilesheet(texid) {
        if (this.texid = texid) {
            const hdr = egg.texture_get_header(this.texid);
            this.glyphw = hdr.w >> 4;
            this.glyphh = hdr.h >> 4;
        }
    }
    setButtonNames(names, standardNames) {
        this.buttonNames = names;
        this.standardNames = standardNames || [];
    }
    begin(devid) {
        this.enabled = false;
        if (!devid)
            return false;
        if (!this.texid && !this.bus.font)
            return false;
        if (!this.buttonNames.length)
            return false;
        this.device = this.bus.joyTwoState.devices.find(d => d.devid === devid) || null;
        if (!this.device)
            return false;
        for (this.buttonp = 0; this.buttonp < this.buttonNames.length; this.buttonp++) {
            if (this.buttonNames[this.buttonp])
                break;
        }
        if (this.buttonp >= this.buttonNames.length)
            return false; // They gave us names, but they're all empty.
        this.state = 3 /* JoyQueryState.FIRST_WAIT */;
        if ((this.device.natural.size > 0) || this.device.buttons.find(b => b.values.find(v => v))) {
            this.state = 1 /* JoyQueryState.INITIAL_ZERO */;
        }
        this.enabled = true;
        this.timeout = TIMEOUT;
        this.changes = [];
        if (!this.twoStateListener) {
            this.twoStateListener = this.bus.joyTwoState.listen((d, b, p, v) => this.onTwoState(d, b, p, v));
        }
        this.bus.joyLogical.suspend();
        return true;
    }
    cancel() {
        this.enabled = false;
        this.bus.joyTwoState.unlisten(this.twoStateListener);
        this.twoStateListener = 0;
        this.bus.joyLogical.resume();
    }
    commit() {
        this.bus.joyLogical.replaceMap(this.device, this.changes);
    }
    update(elapsed) {
        if (!this.enabled)
            return;
        if ((this.timeout -= elapsed) <= 0) {
            this.advance(false);
        }
    }
    render() {
        if (!this.enabled)
            return;
        egg.draw_rect(1, 0, 0, this.screenw, this.screenh, 0x000000c0);
        if (this.bus.font) {
            this.renderWithFont();
        }
        else {
            this.renderWithTiles();
        }
    }
    renderWithFont() {
        const message = this.getMessage();
        if (message !== this.labelMessage) {
            egg.texture_del(this.labelTexid);
            this.labelTexid = this.bus.font.renderTexture(message);
            const hdr = egg.texture_get_header(this.labelTexid);
            this.labelw = hdr.w;
            this.labelh = hdr.h;
        }
        const dstx = (this.screenw >> 1) - (this.labelw >> 1);
        const dsty = (this.screenh >> 1) - (this.labelh >> 1);
        egg.draw_decal(1, this.labelTexid, dstx, dsty, 0, 0, this.labelw, this.labelh, 0);
        if ((this.timeout < TIMEOUT_VISIBLE) && (this.glyphw > 0)) {
            const x = (this.screenw >> 1) - (this.glyphw >> 1);
            const y = (this.screenh >> 1) + this.glyphh;
            const tileid = 0x30 + Math.floor(this.timeout);
            const srcx = (tileid & 0x0f) * this.glyphw;
            const srcy = (tileid >> 4) * this.glyphh;
            egg.draw_mode(0 /* egg.XferMode.ALPHA */, 0xffffffff, 0xff);
            egg.draw_decal(1, this.texid, x, y, srcx, srcy, this.glyphw, this.glyphh, 0);
            egg.draw_mode(0 /* egg.XferMode.ALPHA */, 0, 0xff);
        }
    }
    renderWithTiles() {
        const message = this.getMessage();
        const tileCount = message.length + ((this.timeout < TIMEOUT_VISIBLE) ? 1 : 0);
        if (!this.tiles || (tileCount * 6 > this.tiles.length)) {
            this.tiles = new Uint8Array(tileCount * 6);
        }
        let tilep = 0;
        let x = (this.screenw >> 1) - ((message.length * this.glyphw) >> 1);
        let y = this.screenh >> 1;
        for (let i = 0; i < message.length; i++, x += this.glyphw) {
            this.tiles[tilep++] = x;
            this.tiles[tilep++] = x >> 8;
            this.tiles[tilep++] = y;
            this.tiles[tilep++] = y >> 8;
            this.tiles[tilep++] = message.charCodeAt(i);
            this.tiles[tilep++] = 0;
        }
        if (this.timeout < TIMEOUT_VISIBLE) {
            x = this.screenw >> 1;
            y = (this.screenh >> 1) + (this.glyphh << 1);
            this.tiles[tilep++] = x;
            this.tiles[tilep++] = x >> 8;
            this.tiles[tilep++] = y;
            this.tiles[tilep++] = y >> 8;
            this.tiles[tilep++] = 0x30 + Math.floor(this.timeout);
            this.tiles[tilep++] = 0;
        }
        egg.draw_mode(0 /* egg.XferMode.ALPHA */, 0xffffffff, 0xff);
        egg.draw_tile(1, this.texid, this.tiles.buffer, tileCount);
        egg.draw_mode(0 /* egg.XferMode.ALPHA */, 0, 0xff);
    }
    getMessage() {
        switch (this.state) {
            case 2 /* JoyQueryState.ERROR_WAIT */:
                return this.prompts[0].replace('%', this.buttonNames[this.buttonp]);
                break;
            case 3 /* JoyQueryState.FIRST_WAIT */:
                return this.prompts[1].replace('%', this.buttonNames[this.buttonp]);
                break;
            case 5 /* JoyQueryState.AGAIN_WAIT */:
                return this.prompts[2].replace('%', this.buttonNames[this.buttonp]);
                break;
        }
        return "";
    }
    onTwoState(devid, btnid, part, value) {
        if (!this.enabled)
            return;
        if (devid !== this.device.devid)
            return;
        switch (this.state) {
            case 1 /* JoyQueryState.INITIAL_ZERO */:
                {
                    if ((this.device.natural.size > 0) || this.device.buttons.find(b => b.values.find(v => v))) {
                        // still waiting...
                    }
                    else if (!value) {
                        this.state = 3 /* JoyQueryState.FIRST_WAIT */;
                        this.timeout = TIMEOUT;
                    }
                }
                break;
            case 2 /* JoyQueryState.ERROR_WAIT */:
            case 3 /* JoyQueryState.FIRST_WAIT */:
                {
                    if (!value)
                        return;
                    this.srcbtnid = btnid;
                    this.srcpart = part;
                    this.timeout = TIMEOUT;
                    this.state = 4 /* JoyQueryState.FIRST_HOLD */;
                }
                break;
            case 4 /* JoyQueryState.FIRST_HOLD */:
                {
                    if ((btnid === this.srcbtnid) && (part === this.srcpart) && !value) {
                        this.state = 5 /* JoyQueryState.AGAIN_WAIT */;
                        this.timeout = TIMEOUT;
                    }
                    else if (value) {
                        this.state = 2 /* JoyQueryState.ERROR_WAIT */;
                        this.timeout = TIMEOUT;
                    }
                }
                break;
            case 5 /* JoyQueryState.AGAIN_WAIT */:
                {
                    if (!value)
                        return;
                    if ((btnid !== this.srcbtnid) || (part !== this.srcpart)) {
                        this.state = 2 /* JoyQueryState.ERROR_WAIT */;
                        this.timeout = TIMEOUT;
                    }
                    else {
                        this.state = 6 /* JoyQueryState.AGAIN_HOLD */;
                        this.timeout = TIMEOUT;
                    }
                }
                break;
            case 6 /* JoyQueryState.AGAIN_HOLD */:
                {
                    if ((btnid === this.srcbtnid) && (part === this.srcpart) && !value) {
                        this.advance(true);
                    }
                    else if (value) {
                        this.state = 2 /* JoyQueryState.ERROR_WAIT */;
                        this.timeout = TIMEOUT;
                    }
                }
                break;
            default: this.cancel();
        }
    }
    advance(record) {
        if (record) {
            this.changes.push({ srcbtnid: this.srcbtnid, srcpart: this.srcpart, dstbtnid: 1 << this.buttonp });
        }
        for (;;) {
            this.buttonp++;
            if (this.buttonp >= this.buttonNames.length) {
                this.commit();
                this.cancel();
                return;
            }
            if (this.buttonNames[this.buttonp])
                break;
        }
        this.state = 3 /* JoyQueryState.FIRST_WAIT */;
        this.timeout = TIMEOUT;
    }
}
