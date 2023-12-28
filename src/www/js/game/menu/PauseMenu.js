/* PauseMenu.js
 */
 
import { Game } from "../Game.js";
import { DataService } from "../DataService.js";
import { InputBtn } from "../core/InputManager.js";

const TILESIZE = 16;
const HIGHLIGHT_PERIOD =     0.800;
const HIGHLIGHT_DUTY_CYCLE = 0.600;
 
export class PauseMenu {
  static getDependencies() {
    return [Game, DataService];
  }
  constructor(game, dataService) {
    this.game = game;
    this.dataService = dataService;
    
    this.onHold = null; // Owner may set to another Menu waiting for this one to complete. Don't touch.
    
    this.pvinput = 0;
    this.highlightClock = 0;
  }
  
  dismissing() {
  }
  
  update(elapsed, inputState) {
    if (inputState !== this.pvinput) {
      const dpad = (btnid, dx, dy) => {
        if ((inputState & btnid) && !(this.pvinput & btnid)) this.onMotion(dx, dy);
      };
      dpad(InputBtn.LEFT, -1, 0);
      dpad(InputBtn.RIGHT, 1, 0);
      dpad(InputBtn.UP, 0, -1);
      dpad(InputBtn.DOWN, 0, 1);
      // It's tempting to dismiss on A or B too, but don't -- the Hero will pick it up as a jump or action trigger.
      // Not that that problem couldn't be solved, but hey, it doesn't need to.
      this.pvinput = inputState;
    }
    if ((this.highlightClock += elapsed) >= HIGHLIGHT_PERIOD) {
      this.highlightClock -= HIGHLIGHT_PERIOD;
    }
  }
  
  onMotion(dx, dy) {
    let x = this.game.selectedItem % 3;
    let y = Math.floor(this.game.selectedItem / 3);
    x += dx; if (x < 0) x = 2; else if (x >= 3) x = 0;
    y += dy; if (y < 0) y = 2; else if (y >= 3) y = 0;
    this.game.selectedItem = y * 3 + x;
    this.highlightClock = 0; // reset highlight phase, make sure it's visible as it moves
    this.game.audioManager.soundEffect("uiMotion");
  }
  
  /* Caller draws the scene first, and no framing or anything before calling us.
   */
  render(context, canvas) {
    const graphics = this.dataService.getResourceSync("image", 1);
    if (!graphics) return;
    
    const dstcolc = 7;
    const dstrowc = 7;
    const dstw = dstcolc * TILESIZE;
    const dsth = dstrowc * TILESIZE;
    const dstx = (canvas.width >> 1) - (dstw >> 1);
    const dsty = (canvas.height >> 1) - (dsth >> 1);
    const iconmargin = 6;
    const iconspace = 2;
    
    const frameTile = (dstcol, dstrow, srccol, srcrow) => {
      context.drawImage(graphics,
        srccol * TILESIZE,
        336 + srcrow * TILESIZE,
        TILESIZE, TILESIZE,
        dstx + dstcol * TILESIZE,
        dsty + dstrow * TILESIZE,
        TILESIZE, TILESIZE
      );
    };
    for (let col=1; col<dstcolc-1; col++) {
      frameTile(col, 0, 1, 0);
      frameTile(col, dstrowc-1, 1, 2);
      for (let row=1; row<dstrowc-1; row++) {
        frameTile(col, row, 1, 1);
      }
    }
    for (let row=1; row<dstrowc-1; row++) {
      frameTile(0, row, 0, 1);
      frameTile(dstcolc-1, row, 2, 1);
    }
    frameTile(0, 0, 0, 0);
    frameTile(dstcolc-1, 0, 2, 0);
    frameTile(0, dstrowc-1, 0, 2);
    frameTile(dstcolc-1, dstrowc-1, 2, 2);
    
    const srcx0 = 144;
    const srcy0 = 272;
    const itemTile = (col, row) => {
      context.drawImage(graphics,
        srcx0 + col * TILESIZE * 2,
        srcy0 + row * TILESIZE * 2,
        TILESIZE * 2, TILESIZE * 2,
        dstx + iconmargin + col * (TILESIZE * 2 + iconspace),
        dsty + iconmargin + row * (TILESIZE * 2 + iconspace),
        TILESIZE * 2, TILESIZE * 2
      );
    };
    for (let row=0, itemid=0; row<3; row++) {
      for (let col=0; col<3; col++, itemid++) {
        if ((this.game.selectedItem === itemid) && (this.highlightClock <= HIGHLIGHT_DUTY_CYCLE)) {
          // Highlight, even if we don't have it.
          context.fillStyle = "#080";
          context.fillRect(
            dstx + iconmargin + col * (TILESIZE * 2 + iconspace) - 1,
            dsty + iconmargin + row * (TILESIZE * 2 + iconspace) - 1,
            TILESIZE * 2 + 2, TILESIZE * 2 + 2
          );
        }
        if (this.game.inventory[itemid]) {
          itemTile(col, row);
        }
      }
    }
  }
}
