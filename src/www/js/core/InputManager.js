/* InputManager.js
 * Keyboard, Gamepad, touch.
 */
 
import { Bus } from "../input/Bus.js";
import { TextService } from "../utility/TextService.js";
import { Font } from "../utility/Font.js";

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
    return [];
  }
  constructor() {
    this.bus = new Bus();
    this.textService = new TextService();
    
    this.font = new Font(9);
    this.font.addPage(0x21, 2);
    
    const buttonNames = [
      this.textService.getString(2), // Left
      this.textService.getString(3), // Right
      this.textService.getString(4), // Up
      this.textService.getString(5), // Down
      this.textService.getString(6), // Jump
      this.textService.getString(7), // Action
      this.textService.getString(8), // Pause
    ];
    this.bus.setButtonNames(
      buttonNames,
      [
        buttonNames[4], "", buttonNames[5], "", "", "", "", "", "", buttonNames[6], "", "", 
        buttonNames[2], buttonNames[3], buttonNames[0], buttonNames[1],
      ]
    );
    this.bus.joyQuery.setPrompts([
      this.textService.getString(9),
      this.textService.getString(10),
      this.textService.getString(11),
    ]);
    this.bus.setFont(this.font);
    this.bus.requireJoysticks();
    
    this.state = 0;
    this.recentDevid = 0;
    
    this.bus.listen(["key", "input", "connect"], e => this.onEvent(e));
    this.bus.joyLogical.listen((p, b, v, s) => {
      if (!p) this.state = s;
    });
  }
  
  /* Whoever owns the requestAnimationFrame (Game.js) should call this each video frame.
   */
  update(elapsed) {
    this.bus.update(elapsed);
    return this.state;
  }
  
  render() {
    this.bus.render();
  }
  
  onEvent(event) {
    switch (event.eventType) {
      case 1: this.recentDevid = event.v0; break;
      case 2: this.recentDevid = event.v0; break;
      case 11: if (event.v1) switch (event.v0) {
          case 0x00070029: egg.request_termination(); break; // esc
          case 0x0007003a: {
              if (this.recentDevid) {
                const result = this.bus.beginJoyQuery(this.recentDevid); 
              }
            } break; // f1
        } break;
    }
  }
   
  adjustState(btnid, value) {
    if (value) {
      if (this.state & btnid) return;
      this.state |= btnid;
    } else {
      if (!(this.state & btnid)) return;
      this.state &= ~btnid;
    }
  }
}

InputManager.singleton = true;
