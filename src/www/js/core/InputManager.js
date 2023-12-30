/* InputManager.js
 * Keyboard, Gamepad, touch.
 */

// The digested input state is expressed as 16 bits, of which we actually use 7.
export const InputBtn = {
  LEFT:   0x0001,
  RIGHT:  0x0002,
  UP:     0x0004,
  DOWN:   0x0008,
  JUMP:   0x0010,
  ACTION: 0x0020,
  PAUSE:  0x0040,
  HORZ:   0x0003, // composite
  VERT:   0x000c, // composite
};
 
export class InputManager {
  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
    
    this.state = 0;
    this.keyMap = []; // {code,btnid}. Both live and permanent.
    this.gamepadMap = []; // Keyed by (Gamepad.index). {id,axes:[{p,test,btnid,v}],buttons:[{p,btnid,v}]}
    this.gamepadMapTemplates = []; // Permanent. {id,axes:[{p,thresh:-0.5|0.5,btnid}],buttons:[{p,btnid}]}
    this.configurationContext = null;
    this.animationFrameRequest = null;
    
    this.loadRules();
    if (!this.keyMap.length) {
      this.keyMap = [
        { code: "ArrowLeft", btnid: InputBtn.LEFT },
        { code: "ArrowRight", btnid: InputBtn.RIGHT },
        { code: "ArrowUp", btnid: InputBtn.UP },
        { code: "ArrowDown", btnid: InputBtn.DOWN },
        { code: "KeyZ", btnid: InputBtn.JUMP },
        { code: "KeyX", btnid: InputBtn.ACTION },
        { code: "Enter", btnid: InputBtn.PAUSE },
      ];
    }
    
    this.window.addEventListener("keydown", e => this.onKey(e));
    this.window.addEventListener("keyup", e => this.onKey(e));
    this.window.addEventListener("gamepadconnected", e => this.onGamepadConnected(e));
    this.window.addEventListener("gamepaddisconnected", e => this.onGamepadDisconnected(e));
  }
  
  /* Whoever owns the requestAnimationFrame (Game.js) should call this each video frame.
   */
  update() {
    this.pollGamepads();
    return this.state;
  }
  
  /* ugh.... When we do live configuration, the game is paused hard, so there's no updates.
   * Whoever starts live config should also enable/disable selfUpdate if that is indeed the case.
   * Be careful not to enable selfUpdate if the game is running.
   */
  selfUpdate(enable) {
    if (enable) {
      if (this.animationFrameRequest) return;
      this.animationFrameRequest = "not null";
      this.selfUpdateFrame();
    } else {
      if (!this.animationFrameRequest) return;
      this.window.cancelAnimationFrame(this.animationFrameRequest);
      this.animationFrameRequest = null;
    }
  }
  
  selfUpdateFrame() {
    if (!this.animationFrameRequest) return;
    this.update();
    this.animationFrameRequest = this.window.requestAnimationFrame(() => this.selfUpdateFrame());
  }
  
  reprState(state) {
    let dst = "";
    if (state & InputBtn.LEFT) dst += "LEFT,";
    if (state & InputBtn.RIGHT) dst += "RIGHT,";
    if (state & InputBtn.UP) dst += "UP,";
    if (state & InputBtn.DOWN) dst += "DOWN,";
    if (state & InputBtn.JUMP) dst += "JUMP,";
    if (state & InputBtn.ACTION) dst += "ACTION,";
    if (state & InputBtn.PAUSE) dst += "PAUSE,";
    return dst;
  }
  
  /* Persistence.
   *******************************************************************/
   
  loadRules() {
    try {
      this.keyMap = JSON.parse(this.window.localStorage.getItem("keyMap")) || [];
    } catch (e) {
      this.keyMap = [];
    }
    try {
      this.gamepadMapTemplates = JSON.parse(this.window.localStorage.getItem("gamepadMap")) || [];
    } catch (e) {
      this.gamepadMapTemplates = [];
    }
  }
  
  saveRules() {
    this.window.localStorage.setItem("keyMap", JSON.stringify(this.keyMap));
    this.window.localStorage.setItem("gamepadMap", JSON.stringify(this.gamepadMapTemplates));
  }
  
  /* Interactive configuration.
   ****************************************************************************/
  
  /* Puts us in the "configuring" state and returns a context you must hold on to.
   */
  beginConfiguration() {
    const ctx = {
      ready: false,
      message: "Press LEFT",
      onChange: () => {}, // owner should set
      // private:
      btnid: InputBtn.LEFT,
      confirmMap: null,
      keyMap: [], // {code,btnid} same as InputManager.keyMap.
      gamepadMap: [], // {gpid,gpix,axis|button,btnid} axis value is eg "+0", "-1", which axis and which direction on it.
      gamepadState: [], // Keyed by Gamepad.index. {axes,buttons} copied from the previous poll.
    };
    this.configurationContext = ctx;
    return ctx;
  }
  
  commitConfiguration() {
    if (!this.configurationContext) return;
    
    /* keyMap is easy. If they touched the keyboard at all for this session, replace it entirely.
     * The format of keyMap is identical in the config session and our live maps.
     */
    if (this.configurationContext.keyMap.length > 0) {
      this.keyMap = this.configurationContext.keyMap;
    }
    
    /* Drop any live gamepad maps for involved devices, then rebuild from scratch.
     */
    for (const incoming of this.configurationContext.gamepadMap) {
      this.gamepadMap[incoming.gpix] = null;
    }
    for (const incoming of this.configurationContext.gamepadMap) {
      let map = this.gamepadMap[incoming.gpix];
      if (!map) {
        map = {
          id: incoming.gpid,
          axes: [],
          buttons: [],
        };
        this.gamepadMap[incoming.gpix] = map;
      }
      if (incoming.axis) {
        const sign = incoming.axis[0];
        const axisp = +incoming.axis.substring(1);
        if (sign < 0) {
          map.axes.push({ p: axisp, test: v => v <= -0.5, btnid: incoming.btnid, v: 0 });
        } else {
          map.axes.push({ p: axisp, test: v => v >= 0.5, btnid: incoming.btnid, v: 0 });
        }
      } else if (typeof(incoming.button) === "number") {
        map.buttons.push({ p: incoming.button, btnid: incoming.btnid, v: 0 });
      }
    }
    
    /* Replace permanent gamepad maps for involved devices.
     */
    for (const incoming of this.configurationContext.gamepadMap) {
      const p = this.gamepadMapTemplates.findIndex(t => t.id === incoming.gpid);
      if (p >= 0) this.gamepadMapTemplates.splice(p, 1);
    }
    for (const incoming of this.configurationContext.gamepadMap) {
      let t = this.gamepadMapTemplates.find(t => t.id === incoming.gpid);
      if (!t) {
        t = {
          id: incoming.gpid,
          axes: [],
          buttons: [],
        };
        this.gamepadMapTemplates.push(t);
      }
      if (incoming.axis) {
        const sign = incoming.axis[0];
        const axisp = +incoming.axis.substring(1);
        if (sign < 0) {
          t.axes.push({ p: axisp, thresh: -0.5, btnid: incoming.btnid });
        } else {
          t.axes.push({ p: axisp, thresh: 0.5, btnid: incoming.btnid });
        }
      } else if (typeof(incoming.button) === "number") {
        t.buttons.push({ p: incoming.button, btnid: incoming.btnid });
      }
    }
    
    this.configurationContext = null;
    this.saveRules();
  }
  
  cancelConfiguration() {
    this.configurationContext = null;
  }
  
  /* Set a new message for the config context, mark it complete if it is, and trigger its callback.
   */
  updateConfigurationMessage(error) {
    if (error) this.configurationContext.message = "ERROR! ";
    else this.configurationContext.message = "";
    switch (this.configurationContext.btnid) {
      case InputBtn.LEFT: this.configurationContext.message += "Press LEFT"; break;
      case InputBtn.RIGHT: this.configurationContext.message += "Press RIGHT"; break;
      case InputBtn.UP: this.configurationContext.message += "Press UP"; break;
      case InputBtn.DOWN: this.configurationContext.message += "Press DOWN"; break;
      case InputBtn.JUMP: this.configurationContext.message += "Press JUMP"; break;
      case InputBtn.ACTION: this.configurationContext.message += "Press ACTION"; break;
      case InputBtn.PAUSE: this.configurationContext.message += "Press PAUSE"; break;
      default: this.configurationContext.ready = true; this.configurationContext.message = "";
    }
    if (this.configurationContext.confirmMap) this.configurationContext.message += " again";
    this.configurationContext.onChange();
  }
  
  /* Keyboard and Gamepad event reception should call this when (configurationContext) present,
   * when there's an ON-state event.
   * (partialMap) is an object ready for the context's (keyMap) or (gamepadMap), but without (btnid).
   */
  advanceConfiguration(partialMap) {
    if (this.configurationContext.confirmMap) {
      // We are waiting for something...
      if (
        (partialMap.code === this.configurationContext.confirmMap.code) &&
        (partialMap.gpid === this.configurationContext.confirmMap.gpid) &&
        (partialMap.gpix === this.configurationContext.confirmMap.gpix) &&
        (partialMap.axis === this.configurationContext.confirmMap.axis) &&
        (partialMap.button === this.configurationContext.confirmMap.button)
      ) {
        // Confirmed.
        if (partialMap.code) {
          this.configurationContext.keyMap.push({ ...partialMap, btnid: this.configurationContext.btnid });
          this.configurationContext.confirmMap = null;
          this.configurationContext.btnid <<= 1;
        } else if (partialMap.gpid) {
          this.configurationContext.gamepadMap.push({ ...partialMap, btnid: this.configurationContext.btnid });
          this.configurationContext.confirmMap = null;
          this.configurationContext.btnid <<= 1;
        }
        this.updateConfigurationMessage(false);
      } else {
        // Incorrect event! Request a first stroke again.
        this.configurationContext.confirmMap = null;
        this.updateConfigurationMessage(true);
      }
    } else {
      // Not waiting. Hold this event and request another like it.
      this.configurationContext.confirmMap = partialMap;
      this.updateConfigurationMessage(false);
    }
  }
  
  /* Internal shared plumbing.
   ****************************************************************************/
   
  adjustState(btnid, value) {
    if (value) {
      if (this.state & btnid) return;
      this.state |= btnid;
    } else {
      if (!(this.state & btnid)) return;
      this.state &= ~btnid;
    }
  }
  
  /* Keyboard.
   *****************************************************************************/
   
  onKey(event) {
    
    /* Don't interfere with events if control or alt is down.
     */
    if (event.ctrlKey || event.altKey) return;
    
    // Likewise, don't interfere with the F keys.
    if (event.code.startsWith("F")) return;
    
    // Everything else, we consume it.
    event.stopPropagation();
    event.preventDefault();
    if (event.repeat) return;
    
    // Configuration in progress?
    if (this.configurationContext) {
      if ((event.type === "keydown") && !event.repeat) {
        this.advanceConfiguration({ code: event.code });
      }
      return;
    }
    
    // Normal mapping.
    const map = this.keyMap.find(m => m.code === event.code);
    if (!map) return;
    if (event.type === "keydown") this.adjustState(map.btnid, 1);
    else this.adjustState(map.btnid, 0);
  }
  
  /* Gamepad.
   ***********************************************************************/
   
  onGamepadConnected(event) {
    const map = this.generateMapForGamepad(event.gamepad);
    this.gamepadMap[event.gamepad.index] = map;
  }
   
  onGamepadDisconnected(event) {
    const map = this.gamepadMap[event.gamepad.index];
    delete this.gamepadMap[event.gamepad.index];
    if (map) this.zeroGamepadMap(map);
  }
  
  zeroGamepadMap(map) {
    for (const axis of map.axes) {
      if (!axis.v) continue;
      this.adjustState(axis.btnid, 0);
    }
    for (const button of map.buttons) {
      if (!button.v) continue;
      this.adjustState(button.btnid, 0);
    }
  }
  
  pollGamepads() {
    if (!this.window.navigator.getGamepads) return; // old browser, or unsecure connection
    for (const gamepad of this.window.navigator.getGamepads()) {
      if (!gamepad) continue;
      
      if (this.configurationContext) {
        this.pollGamepadUnderConfiguration(gamepad);
        continue;
      }
      
      const map = this.gamepadMap[gamepad.index];
      if (!map) continue;
      for (const axis of map.axes) {
        const srcv = gamepad.axes[axis.p] || 0;
        const v = axis.test(srcv);
        if (v === axis.v) continue;
        axis.v = v;
        this.adjustState(axis.btnid, v);
      }
      for (const button of map.buttons) {
        const v = gamepad.buttons[button.p].value ? 1 : 0;
        if (v === button.v) continue;
        button.v = v;
        this.adjustState(button.btnid, v);
      }
    }
  }
  
  pollGamepadUnderConfiguration(gamepad) {
    let prev = this.configurationContext.gamepadState[gamepad.index];
    if (!prev) {
      prev = {
        gpid: gamepad.id,
        axes: (gamepad.axes || []).map(() => 0),
        buttons: (gamepad.buttons || []).map(() => 0),
      };
      this.configurationContext.gamepadState[gamepad.index] = prev;
    }
    if (gamepad.axes) for (let i=gamepad.axes.length; i-->0; ) {
      const pv = (prev.axes[i] <= -0.5) ? -1 : (prev.axes[i] >= 0.5) ? 1 : 0;
      const nx = (gamepad.axes[i] <= -0.5) ? -1 : (gamepad.axes[i] >= 0.5) ? 1 : 0;
      if (nx && !pv) {
        if (nx < 0) {
          this.advanceConfiguration({ gpid: gamepad.id, gpix: gamepad.index, axis: "-" + i });
        } else {
          this.advanceConfiguration({ gpid: gamepad.id, gpix: gamepad.index, axis: "+" + i });
        }
      }
      prev.axes[i] = gamepad.axes[i];
    }
    if (gamepad.buttons) for (let i=gamepad.buttons.length; i-->0; ) {
      const pv = prev.buttons[i];
      const nx = gamepad.buttons[i].value;
      if (nx && !pv) {
        this.advanceConfiguration({ gpid: gamepad.id, gpix: gamepad.index, button: i });
      }
      prev.buttons[i] = gamepad.buttons[i].value;
    }
  }
  
  // Null if we decline to map it, and it's fine to insert that in (this.gamepadMap).
  generateMapForGamepad(gamepad) {
    const t = this.gamepadMapTemplates.find(t => t.id === gamepad.id);
    if (!t) return this.synthesizeMapForUnknownGamepad(gamepad);
    const map = {
      id: t.id,
      axes: t.axes.map(axis => ({
        p: axis.p,
        test: (axis.thresh < 0) ? (v => v <= axis.thresh) : (v => v >= axis.thresh),
        btnid: axis.btnid,
        v: 0,
      })),
      buttons: t.buttons.map(button => ({
        p: button.p,
        btnid: button.btnid,
        v: 0,
      })),
    };
    return map;
  }
  
  synthesizeMapForUnknownGamepad(gamepad) {
    // Return null if it's not going to work. Require 3 buttons and either 2 axes or 4 more buttons.
    if (gamepad.buttons.length < 3) return null;
    if (
      (gamepad.axes.length < 2) &&
      (gamepad.buttons.length < 7)
    ) return null;
    const map = {
      id: gamepad.id,
      axes: [],
      buttons: [],
    };
    // Axes map even/odd to horz/vert.
    for (let p=0; p<gamepad.axes.length; p++) {
      map.axes.push({
        p,
        test: v => v <= -0.5,
        btnid: (p & 1) ? InputBtn.UP : InputBtn.LEFT,
        v: 0,
      });
      map.axes.push({
        p,
        test: v => v >= 0.5,
        btnid: (p & 1) ? InputBtn.DOWN : InputBtn.RIGHT,
        v: 0,
      });
    }
    // Buttons cycle thru [JUMP,ACTION,PAUSE] or [...,LEFT,RIGHT,UP,DOWN].
    const btnids = [InputBtn.JUMP, InputBtn.ACTION, InputBtn.PAUSE];
    if (gamepad.axes.length < 2) {
      btnids.push(InputBtn.LEFT);
      btnids.push(InputBtn.RIGHT);
      btnids.push(InputBtn.UP);
      btnids.push(InputBtn.DOWN);
    }
    for (let p=0, btnidp=0; p<gamepad.buttons.length; p++, btnidp++) {
      if (btnidp >= btnids.length) btnidp = 0;
      map.buttons.push({
        p,
        btnid: btnids[btnidp],
        v: 0,
      });
    }
    return map;
  }
}

InputManager.singleton = true;
