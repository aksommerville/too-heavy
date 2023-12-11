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
    this.keyMap = []; // {code,btnid}
    this.gamepadMap = []; // Keyed by (Gamepad.index). {id,axes:[{p,btnid,v}],buttons:[{p,btnid,v}]}
    
    //TODO Persist keyMap, and let the user modify it.
    this.keyMap = [
      { code: "ArrowLeft", btnid: InputBtn.LEFT },
      { code: "ArrowRight", btnid: InputBtn.RIGHT },
      { code: "ArrowUp", btnid: InputBtn.UP },
      { code: "ArrowDown", btnid: InputBtn.DOWN },
      { code: "KeyZ", btnid: InputBtn.JUMP },
      { code: "KeyX", btnid: InputBtn.ACTION },
      { code: "Enter", btnid: InputBtn.PAUSE },
    ];
    
    this.window.addEventListener("keydown", e => this.onKey(e));
    this.window.addEventListener("keyup", e => this.onKey(e));
    this.window.addEventListener("gamepadconnected", e => this.onGamepadConnected(e));
    this.window.addEventListener("gamepaddisconnected", e => this.onGamepadDisconnected(e));
  }
  
  update() {
    this.pollGamepads();
    return this.state;
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
  
  /* Internal shared plumbing.
   ****************************************************************************/
   
  adjustState(btnid, value) {
    /* TODO If events come in faster than updates, we could drop fast on-off-on sequences.
     * Is that a realistic possibility?
     * If so, we'll need some latching logic here to ensure that every state change does get reported at update().
     * I think it's only relevant to keyboards, joysticks get polled at update (so if there's a fast on-off-on, we wouldn't even see it).
     */
    if (value) {
      if (this.state & btnid) return;
      this.state |= btnid;
    } else {
      if (!(this.state & btnid)) return;
      this.state &= ~btnid;
    }
    //console.log(`InputManager state change: ${this.reprState(this.state)}`);
  }
  
  /* Keyboard.
   *****************************************************************************/
   
  onKey(event) {
    
    // If any modifiers are pressed, let it pass.
    if (event.altKey || event.ctrlKey || event.shiftKey || event.metaKey) return;
    
    // Likewise, don't interfere with the F keys.
    if (event.code.startsWith("F")) return;
    
    // Everything else, we consume it.
    event.stopPropagation();
    event.preventDefault();
    if (event.repeat) return;
    
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
  
  pollGamepads() {
    if (!this.window.navigator.getGamepads) return; // old browser, or unsecure connection
    for (const gamepad of this.window.navigator.getGamepads()) {
      if (!gamepad) continue;
      const map = this.gamepadMap[gamepad.index];
      if (!map) continue;
      for (const axis of map.axes) {
        const srcv = gamepad.axes[axis.p] || 0;
        const v = (srcv < -0.25) ? -1 : (srcv > 0.25) ? 1 : 0; //TODO configurable threshold?
        if (v === axis.v) continue;
        axis.v = v;
        switch (axis.btnid) {
          //TODO Will need hat mapping too :(
          case InputBtn.HORZ: {
              if (v < 0) {
                this.adjustState(InputBtn.LEFT, 1);
                this.adjustState(InputBtn.RIGHT, 0);
              } else if (v > 0) {
                this.adjustState(InputBtn.LEFT, 0);
                this.adjustState(InputBtn.RIGHT, 1);
              } else {
                this.adjustState(InputBtn.LEFT, 0);
                this.adjustState(InputBtn.RIGHT, 0);
              }
            } break;
          case InputBtn.VERT: {
              if (v < 0) {
                this.adjustState(InputBtn.UP, 1);
                this.adjustState(InputBtn.RIGHT, 0);
              } else if (v > 0) {
                this.adjustState(InputBtn.UP, 0);
                this.adjustState(InputBtn.DOWN, 1);
              } else {
                this.adjustState(InputBtn.UP, 0);
                this.adjustState(InputBtn.DOWN, 0);
              }
            } break;
          default: this.adjustState(axis.btnid, v); // either direction will actuate it
        }
      }
      for (const button of map.buttons) {
        const v = gamepad.buttons[button.p].value ? 1 : 0;
        if (v === button.v) continue;
        button.v = v;
        this.adjustState(button.btnid, v);
      }
    }
  }
  
  // Null if we decline to map it, and it's fine to insert that in (this.gamepadMaps).
  generateMapForGamepad(gamepad) {
    //TODO Store configurable maps somewhere, key on (gamepad.id).
    switch (gamepad.id) {
      case "Microsoft X-Box 360 pad (STANDARD GAMEPAD Vendor: 045e Product: 028e)": { // but also my Evercade pad
          return {
            id: gamepad.id,
            axes: [],
            buttons: [
              { p: 14, btnid: InputBtn.LEFT, v: 0 },
              { p: 15, btnid: InputBtn.RIGHT, v: 0 },
              { p: 12, btnid: InputBtn.UP, v: 0 },
              { p: 13, btnid: InputBtn.DOWN, v: 0 },
              { p: 0, btnid: InputBtn.JUMP, v: 0 },
              { p: 2, btnid: InputBtn.ACTION, v: 0 },
              { p: 9, btnid: InputBtn.PAUSE, v: 0 },
            ],
          };
        } break;
      // TODO Generic fallback mapping.
    }
    return null;
  }
}

InputManager.singleton = true;
