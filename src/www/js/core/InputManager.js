/* InputManager.js
 * Keyboard, Gamepad, touch.
 */

// The digested input state is expressed as 16 bits, of which we actually use 7.
export const BTN_LEFT = 0x0001;
export const BTN_RIGHT = 0x0002;
export const BTN_UP = 0x0004;
export const BTN_DOWN = 0x0008;
export const BTN_JUMP = 0x0010;
export const BTN_ACTION = 0x0020;
export const BTN_PAUSE = 0x0040;
 
export class InputManager {
  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
    
    this.state = 0;
    this.keyMap = []; // {code,btnid}
    
    //TODO Persist keyMap, and let the user modify it.
    this.keyMap = [
      { code: "ArrowLeft", btnid: BTN_LEFT },
      { code: "ArrowRight", btnid: BTN_RIGHT },
      { code: "ArrowUp", btnid: BTN_UP },
      { code: "ArrowDown", btnid: BTN_DOWN },
      { code: "KeyZ", btnid: BTN_JUMP },
      { code: "KeyX", btnid: BTN_ACTION },
      { code: "Enter", btnid: BTN_PAUSE },
    ];
    
    //TODO Gamepad
    
    this.window.addEventListener("keydown", e => this.onKey(e));
    this.window.addEventListener("keyup", e => this.onKey(e));
  }
  
  update() {
    return this.state;
  }
  
  reprState(state) {
    let dst = "";
    if (state & BTN_LEFT) dst += "LEFT,";
    if (state & BTN_RIGHT) dst += "RIGHT,";
    if (state & BTN_UP) dst += "UP,";
    if (state & BTN_DOWN) dst += "DOWN,";
    if (state & BTN_JUMP) dst += "JUMP,";
    if (state & BTN_ACTION) dst += "ACTION,";
    if (state & BTN_PAUSE) dst += "PAUSE,";
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
}

InputManager.singleton = true;
