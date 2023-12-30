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
    this.appendScores("Best", this.reprTime(this.dataService.getBestTime()));
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
    const scoresTop = 102;
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
    context.save();
    context.beginPath();
    context.rect(0, 0, 150, 100);
    context.clip();
    this.drawCinemaClipped(context);
    context.restore();
  }
   
  drawCinemaClipped(context) {
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
    
    // box travels in an arc from loading dock to truck.
    const boxstarttime = 0.450, boxendtime = 0.600;
    if ((t >= boxstarttime) && (t < boxendtime)) {
      const startx = 30, endx = 60;
      const bottomy = 60, topy = 30;
      const xtravel = (t - boxstarttime) / (boxendtime - boxstarttime);
      const x = Math.round(startx + xtravel * (endx - startx));
      const midtime = (boxstarttime + boxendtime) * 0.5;
      const ytravel = Math.sqrt(((t < midtime) ? (t - boxstarttime) : (boxendtime - t)) / (boxendtime - boxstarttime));
      const y = Math.round(bottomy + ytravel * (topy - bottomy));
      context.drawDecal(x, y, 329, 178, 32, 14);
      
      // plus hands on each side
      context.drawDecal(26, 62, 452, 54, 10, 6, true);
      context.drawDecal(82, 62, 452, 54, 10, 6, false);
    }
    
    // mail truck
    let truckx = 90;
    if (t >= 0.75) {
      truckx += Math.floor((t - 0.75) * 300);
    }
    context.drawDecal(truckx, 50, 353, 121, 65, 41);
  }
  
  drawAirport(context, t) {
    context.drawDecal(0, 0, 463, 102, 150, 100);
    // plane: dst=33,0 src=614,304 size=117,86
    // ramp: dst=74,79 src=614,391 size=55,11
    // truck: dst=*,49 src=353,121 size=65,41
    
    // Ramp and truck are visible for the first half or so.
    if (t < 0.600) {
      context.drawDecal(74, 79, 614, 391, 55, 11);
      const truckxa = -70, truckxz = 120;
      const truckx = truckxa + Math.round((t / 0.600) * (truckxz - truckxa));
      let trucky = 49;
      if (truckx >= 40) { // up the ramp
        trucky -= Math.floor((truckx - 40) / 20);
      }
      context.drawDecal(truckx, trucky, 353, 121, 65, 41);
    }
    
    // Plane sits still until the truck enters, then taxis off rightward.
    let planex = 33;
    if (t >= 0.600) planex += Math.floor((t - 0.600) * 300);
    context.drawDecal(planex, 0, 614, 304, 117, 86);
  }
  
  drawWorldMap(context, t) {
    context.drawDecal(0, 0, 463, 203, 150, 100);
    const wichitax = 14, wichitay = 67;
    const londonx = 142, londony = 32;
    const dotCountMax = 20;
    const dotCount = Math.ceil(t * dotCountMax);
    const dotRadius = 2;
    const dx = (londonx - wichitax) / dotCountMax;
    const dy = (londony - wichitay) / dotCountMax;
    context.fillStyle = "#fff";
    context.strokeStyle = "#000";
    for (let i=dotCount, x=wichitax, y=wichitay; i-->0; x+=dx, y+=dy) {
      // If I do these all in one path, they go screwy. I dunno... just do a separate path for each.
      context.beginPath();
      context.ellipse(Math.round(x), Math.round(y), dotRadius, dotRadius, 0, 0, 3 * Math.PI);
      context.fill();
    }
  }
  
  drawAbbeyRoad(context, t) {
    context.drawDecal(0, 0, 463, 304, 150, 100);
    const dotxa = 20, dotxz = 130, doty = 61;
    const dotx = dotxa + Math.floor(t * (dotxz - dotxa));
    let srcx = 296 + (Math.floor(t * 20) & 3) * 17;
    context.drawDecal(dotx, doty, srcx, 1, 16, 29, true);
  }
  
  drawStonehenge(context, t) {
    context.drawDecal(0, 0, 614, 1, 150, 100);
    // dot: dst=26,0 src=367,207 size=51,70
    // arm: (l)dst=18,16 (r)dst=56,17 src=395,163(185) size=22,21. 2 frames, same size and anchor. flop for left.
    const armsrcy = (~(t * 20) & 1) ? 163 : 185;
    context.drawDecal(18, 16, 395, armsrcy, 22, 21, true);
    context.drawDecal(56, 17, 395, armsrcy, 22, 21, false);
    context.drawDecal(26, 0, 367, 207, 51, 70);
  }
  
  drawCandyShoppe(context, t) {
    context.drawDecal(0, 0, 614, 102, 150, 100);
    // old lady blink: dst=72,10 src=329,193 size=32,17
    // dot eyes: dst=36,57 src=381,193 size=13,6
    // dot tongue: dst=38..44,67 src=392,200 size=2,3
    
    if (~~(t * 20) % 10 > 8) { // old lady blinks periodically
      context.drawDecal(72, 10, 329, 193, 32, 17);
    }
    
    if ((~~(t * 10)) & 1) { // dot's eyes dart back and forth
      context.drawDecal(36, 57, 381, 193, 13, 6);
    }
    
    // dot's tongue appears and traverses her upper lip twice, in different directions
    if (t < 0.25) {
    } else if (t < 0.35) {
      const t0 = (t - 0.25) * 10;
      const dstx = Math.round(38 * t0 + 44 * (1 - t0));
      context.drawDecal(dstx, 67, 392, 200, 2, 3);
    } else if (t < 0.75) {
    } else if (t < 0.85) {
      const t0 = (t - 0.75) * 10;
      const dstx = Math.round(38 * (1 - t0) + 44 * t0);
      context.drawDecal(dstx, 67, 392, 200, 2, 3);
    }
  }
  
  drawUkPostOffice(context, t) { // (t) can exceed 1
    context.drawDecal(0, 0, 614, 203, 150, 100);
    
    // empty box on the counter and dot walks in from the right
    if (t < 0.200) {
      context.drawDecal(68, 65, 329, 164, 32, 13, true);
      const dotx = 150 + Math.round(t * 5 * (75 - 150));
      const dotsrcx = 296 + ((t * 30) & 3) * 17;
      context.drawDecal(dotx, 71, dotsrcx, 1, 16, 29);
      return;
    }
    
    // dot in a box
    context.drawDecal(68, 50, 362, 164, 32, 28, true);
    
    // dialogue
    if (t < 0.300) {
    } else if (t < 0.700) {
      context.drawDialogue(76, 49, "OK mail me back to Kansas");
    } else if (t < 0.980) {
    } else {
      context.drawDialogue(34, 46, "Too heavy");
      context.drawDecal(72, 54, 368, 193, 12, 13);
    }
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
    if (typeof(t) !== "number") return "99:99.999";
    if (t < 0) return "99:99.999";
    let ms = Math.floor(t * 1000);
    let s = Math.floor(ms / 1000);
    ms %= 1000;
    let min = Math.floor(s / 60);
    if (min >= 100) return "99:99.999";
    s %= 60;
    if (s < 10) s = "0" + s;
    if (ms < 10) ms = "00" + ms;
    else if (ms < 100) ms = "0" + ms;
    return `${min}:${s}.${ms}`;
  }
  
  generateMedals() {
    const dsty = 127;
    if (!this.game.deathCount) {
      this.medals.push({ dstx: 0, dsty, srcx: 419, srcy: 116 });
    }
    if (!this.game.itemUseCount) {
      this.medals.push({ dstx: 0, dsty, srcx: 419, srcy: 149 });
    }
    if (this.deservesEducationMedal()) {
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
  
  deservesEducationMedal() {
    // The various flags feeding this are all true/false/null -- everything must be true.
    if (!this.game.permanentState.schoolJump) return false;
    if (!this.game.permanentState.schoolStopwatch) return false;
    if (!this.game.permanentState.schoolBroom) return false;
    if (!this.game.permanentState.schoolCamera) return false;
    if (!this.game.permanentState.schoolVacuum) return false;
    if (!this.game.permanentState.schoolBell) return false;
    if (!this.game.permanentState.schoolUmbrella) return false;
    if (!this.game.permanentState.schoolBoots) return false;
    if (!this.game.permanentState.schoolGrapple) return false;
    if (!this.game.permanentState.schoolRaft) return false;
    return true;
  }
}
