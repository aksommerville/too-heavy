/* VictoryMenu.js
 */
 
import { Game } from "../Game.js";
import { DataService } from "../DataService.js";
import { InputBtn } from "../core/InputManager.js";

const TILESIZE = 16;
const CREDITS_W = 170;
const CREDITS_MARGIN = 5;
 
export class VictoryMenu {
  static getDependencies() {
    return [Game, DataService];
  }
  constructor(game, dataService) {
    this.game = game;
    this.dataService = dataService;
    
    this.onHold = null; // Owner may set to another Menu waiting for this one to complete. Don't touch.
    this.opaque = true; // Tell CanvasUi that it doesn't need to render the underlying scene.
    
    this.pvinput = 0;
    this.clock = 0;
    
    this.credits = []; // {x,tileid[]} one row at a time
    this.appendCredits("Too Heavy", 0);
    this.appendCredits("");
    this.appendCredits("Code, gfx, music", -1);
    this.appendCredits("AK Sommerville", 1);
    this.appendCredits("");
    this.appendCredits("Addl gfx", -1);
    this.appendCredits("Alex Hansen", 1);
    this.appendCredits("");
    this.appendCredits("GDEX Winter Game Jam", 0);
    this.appendCredits("8 January 2024", 0);
    this.appendCredits("");
    this.appendCredits("Thanks for playing!", 0);
    this.appendCredits("-AK and Dot", 1);
    this.appendCredits("");
    this.appendCredits("Again? Press start.", 0);
    
    this.scores = []; // {x,tileid[]} one row at a time
    this.appendScores("Time", this.reprTime(this.game.playTime));
    this.appendScores("Best", "(TODO)");//TODO
    this.appendScores("Death", this.game.deathCount.toString());
    
    this.medals = []; // {dstx,dsty,srcx,srcy}
    this.generateMedals();
  }
  
  dismissing() {
  }
  
  update(elapsed, inputState) {
    if (inputState !== this.pvinput) {
      //TODO Do we react to input at all?
      this.pvinput = inputState;
    }
    this.clock += elapsed;
    
    if (!this.pvclock) this.pvclock = this.clock;
    const diff = this.clock - this.pvclock;
    if (diff >= 1) {
      this.pvclock = this.clock;
    }
  }
  
  /* Caller draws the scene first, and no framing or anything before calling us.
   */
  render(context, canvas) {
    const graphics = this.dataService.getResourceSync("image", 1);
    if (!graphics) return;
    
    context.fillStyle = "#8af";
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = "#6c7";
    context.fillRect(0, 0, canvas.width - CREDITS_W, canvas.height);
    
    const GLYPH_W = 8;
    const GLYPH_H = 8;
    const creditsLeft = canvas.width - CREDITS_W;
    const creditsHeight = this.credits.length * GLYPH_H;
    const creditsTop = (canvas.height >> 1) - (creditsHeight >> 1);
    for (let y=creditsTop, i=0; i<this.credits.length; i++, y+=GLYPH_H) {
      const row = this.credits[i];
      let x = creditsLeft + row.x;
      for (const tileid of row.tileid) {
        context.drawDecal(x, y, (tileid & 0x0f) * GLYPH_W, 272 + (tileid >> 4) * GLYPH_H, GLYPH_W, GLYPH_H);
        x += GLYPH_W;
      }
    }
    
    const scoresHeight = this.scores.length * GLYPH_H;
    const scoresTop = 104;
    for (let y=scoresTop, i=0; i<this.scores.length; i++, y+=GLYPH_H) {
      const row = this.scores[i];
      let x = row.x;
      for (const tileid of row.tileid) {
        context.drawDecal(x, y, (tileid & 0x0f) * GLYPH_W, 272 + (tileid >> 4) * GLYPH_H, GLYPH_W, GLYPH_H);
        x += GLYPH_W;
      }
    }
    
    for (const medal of this.medals) {
      context.drawDecal(medal.dstx, medal.dsty, medal.srcx, medal.srcy, 32, 32);
    }
    
    this.drawCinema(context);
  }
  
  /* Cinema scenes in the top-left corner. 150x100
   * The song is almost exactly 80 seconds long and we have 7 scenes.
   ******************************************************************************/
   
  drawCinema(context) {
    let clock = this.clock;
    { const len = 12; // Post Office.
      if (clock < len) return this.drawPostOffice(context, clock / len);
      clock -= len;
    }
    { const len = 11; // Airport.
      if (clock < len) return this.drawAirport(context, clock / len);
      clock -= len;
    }
    { const len = 12; // World Map.
      if (clock < len) return this.drawWorldMap(context, clock / len);
      clock -= len;
    }
    { const len = 11; // Abbey Road.
      if (clock < len) return this.drawAbbeyRoad(context, clock / len);
      clock -= len;
    }
    { const len = 11; // Stonehenge.
      if (clock < len) return this.drawStonehenge(context, clock / len);
      clock -= len;
    }
    { const len = 11; // Candy Shoppe.
      if (clock < len) return this.drawCandyShoppe(context, clock / len);
      clock -= len;
    }
    // UK Post Office. This one holds at the end, (t) can overrun.
    this.drawUkPostOffice(context, clock / 10);
  }
  
  drawPostOffice(context, t) {
    context.drawDecal(0, 0, 463, 1, 150, 100);
    //TODO
  }
  
  drawAirport(context, t) {
    context.drawDecal(0, 0, 463, 102, 150, 100);
    //TODO
  }
  
  drawWorldMap(context, t) {
    context.drawDecal(0, 0, 463, 203, 150, 100);
    //TODO
  }
  
  drawAbbeyRoad(context, t) {
    context.drawDecal(0, 0, 463, 304, 150, 100);
    //TODO
  }
  
  drawStonehenge(context, t) {
    context.drawDecal(0, 0, 614, 1, 150, 100);
    //TODO
  }
  
  drawCandyShoppe(context, t) {
    context.drawDecal(0, 0, 614, 102, 150, 100);
    //TODO
  }
  
  drawUkPostOffice(context, t) {
    context.drawDecal(0, 0, 614, 203, 150, 100);
    //TODO
  }
  
  /* Prepare the scores report.
   *********************************************************************************/
  
  appendCredits(src, align) {
    const GLYPH_W = 8;
    const row = {
      x: 0,
      tileid: [],
    };
    if (align < 0) {
      row.x = CREDITS_MARGIN;
    } else if (align > 0) {
      row.x = CREDITS_W - CREDITS_MARGIN - src.length * GLYPH_W;
    } else {
      row.x = (CREDITS_W >> 1) - ((src.length * GLYPH_W) >> 1);
    }
    for (let i=0; i<src.length; i++) {
      let tileid = src.codePointAt(i) - 0x20;
      if ((tileid < 0) || (tileid >= 0x60)) tileid = 0x1f;
      row.tileid.push(tileid);
    }
    this.credits.push(row);
  }
  
  appendScores(k, v) {
    const GLYPH_W = 8;
    const SCORES_W = 320 - CREDITS_W;
    const colc = Math.floor(SCORES_W / GLYPH_W);
    const row = {
      x: (SCORES_W % GLYPH_W) >> 1,
      tileid: [],
    };
    if (v.length > colc) v = v.substring(0, colc);
    if (k.length + v.length > colc) k = k.substring(0, colc - v.length);
    for (let i=0; i<k.length; i++) {
      let tileid = k.codePointAt(i) - 0x20;
      if ((tileid < 0) || (tileid >= 0x60)) tileid = 0x1f;
      row.tileid.push(tileid);
    }
    for (let i=colc-v.length-k.length; i-->0; ) {
      row.tileid.push(0);
    }
    for (let i=0; i<v.length; i++) {
      let tileid = v.codePointAt(i) - 0x20;
      if ((tileid < 0) || (tileid >= 0x60)) tileid = 0x1f;
      row.tileid.push(tileid);
    }
    this.scores.push(row);
  }
  
  reprTime(t) {
    let ms = Math.floor(t * 1000);
    let s = Math.floor(ms / 1000);
    ms %= 1000;
    let min = Math.floor(s / 60);
    s %= 60;
    if (s < 10) s = "0" + s;
    if (ms < 10) ms = "00" + ms;
    else if (ms < 100) ms = "0" + ms;
    return `${min}:${s}.${ms}`;
  }
  
  generateMedals() {
    const dsty = 128;
    if (!this.game.deathCount) {
      this.medals.push({ dstx: 0, dsty, srcx: 419, srcy: 116 });
    }
    if (!this.game.itemUseCount) {
      this.medals.push({ dstx: 0, dsty, srcx: 419, srcy: 149 });
    }
    if (true) { // TODO detect completion of both school rooms
      this.medals.push({ dstx: 0, dsty, srcx: 419, srcy: 182 });
    }
    if (!this.medals.length) return;
    const medalsw = this.medals.length * 32;
    const spaceAll = 150 - medalsw;
    const spaceOne = Math.floor(spaceAll / (this.medals.length + 1));
    for (let i=0, x=spaceOne; i<this.medals.length; i++, x+=32+spaceOne) {
      this.medals[i].dstx = x;
    }
  }
}
