/* MapPaintService.js
 * A no-UI coordinator for map editing.
 * We are a singleton. So there can only be one map under edit at a time.
 * We track the selected tool, selected tile, etc.
 * MapCanvas sends us events like mouseDown, motion...
 *
 * We serve as an event bus for map edit related things.
 * Events:
 *  {id:"setup",map,file}          ; Reinitializing for a new map.
 *  {id:"shutdown"}                ; Ending edit session, can't do anything after this (until the next setup).
 *  {id:"modify"}                  ; Map content changed (cells or meta, dimensions too, we don't distinguish).
 *  {id:"dirty"}                   ; Just like "modify", but never delayed. Reasonable to render at "dirty" but wait for "modify" to save.
 *  {id:"explicitToolLeft",tool}   ; User selection for left mouse button.
 *  {id:"explicitToolRight",tool}  ; '' right
 *  {id:"effectiveToolLeft",tool}  ; What will actually happen on left click (due to modifier keys)
 *  {id:"effectiveToolRight",tool} ; '' right
 *  {id:"paletteTile",tileid}      ; Palette selection.
 *  {id:"motion",x,y}              ; Constant noise.
 *  {id:"renderTileSize"}          ; Zoom in and out, editor ui only
 */
 
export class MapPaintService {
  static getDependencies() {
    return [];
  }
  constructor() {
    this.nextListenerId = 1;
    this.listeners = [];
    this.map = null;
    this.file = null;
    this.mousex = 0; // in tiles, and can be OOB
    this.mousey = 0; // ''
    this.toolInProgress = "";
    this.changedDuringStroke = false; // True if the current toolInProgress has changed something, we'll report it at mouseUp
    this.toolLeft = "rainbow"; // explicit selection only
    this.toolRight = "heal"; // ''
    this.paletteTile = 0;
    this.modifiers = 0;
    this.familyByTileid = MapPaintService.digestTileprops();
    this.renderTileSize = 32;
  }
  
  listen(cb) {
    const id = this.nextListenerId++;
    this.listeners.push({ id, cb });
    return id;
  }
  
  unlisten(id) {
    const p = this.listeners.findIndex(l => id === l.id);
    if (p >= 0) this.listeners.splice(p, 1);
  }
  
  broadcast(event) {
    for (const { cb } of this.listeners) cb(event);
  }
  
  setup(map, file) {
    if (map) {
      this.map = map;
      this.file = file;
      this.broadcast({ id: "setup", map, file });
    } else {
      this.map = null;
      this.file = null;
      this.broadcast({ id: "shutdown" });
    }
  }
  
  // Sends a shutdown *if this is the current map*, otherwise noop.
  unsetup(map, file) {
    if ((map === this.map) && (file === this.file)) {
      this.map = null;
      this.file = null;
      this.broadcast({ id: "shutdown" });
    }
  }
  
  /* Tool selection.
   ****************************************************************/
  
  // As reported by browser: 0,1,2=left,middle,right
  getToolForButton(button) {
    let selection = "";
    switch (button) {
      case 0: selection = this.toolLeft; break;
      case 2: selection = this.toolRight; break;
    }
    const schema = MapPaintService.TOOLS.find(t => t.name === selection);
    if (schema) {
      if (schema.mod) {
        for (const { condition, tool } of schema.mod) {
          if ((this.modifiers & condition) === condition) {
            selection = tool;
            break;
          }
        }
      }
    } else {
      selection = "";
    }
    return selection;
  }
  
  /* "verbatim": Draw the palette selection on to the map.
   ******************************************************************/
  
  verbatimMotion(suppressBroadcast) {
    const p = this.mousey * this.map.w + this.mousex;
    if (this.paletteTile === this.map.v[p]) return;
    this.map.v[p] = this.paletteTile;
    this.changedDuringStroke = true;
    if (!suppressBroadcast) this.broadcast({ id:"dirty" });
  }
   
  verbatimBegin() {
    this.toolInProgress = "verbatim";
    this.verbatimMotion();
  }
  
  /* "rainbow": Basically "verbatim" + "heal".
   *******************************************************************/
   
  rainbowMotion() {
    this.verbatimMotion(true);
    this.healMotion(true);
  }
  
  rainbowBegin() {
    this.toolInProgress = "rainbow";
    this.rainbowMotion();
  }
  
  /* "monalisa": Palette selection serves as an anchor; draw its neighbors on drag.
   ******************************************************************/
   
  monalisaMotion() {
    const dx = this.mousex - this.anchorx;
    const dy = this.mousey - this.anchory;
    const srccol = (this.paletteTile & 0x0f) + dx;
    const srcrow = (this.paletteTile >> 4) + dy;
    if ((srccol < 0) || (srccol >= 16)) return;
    if ((srcrow < 0) || (srcrow >= 16)) return;
    const tileid = (srcrow << 4) | srccol;
    const p = this.mousey * this.map.w + this.mousex;
    if (this.map.v[p] === tileid) return;
    this.map.v[p] = tileid;
    this.changedDuringStroke = true;
    this.broadcast({ id:"dirty" });
  }
  
  monalisaBegin() {
    this.toolInProgress = "monalisa";
    this.monalisaMotion();
  }
  
  /* "pickup": Use the map tile at click point as the new palette selection.
   * No motion, single click only.
   *********************************************************************/
   
  pickupBegin() {
    const tileid = this.map.v[this.mousey * this.map.w + this.mousex];
    this.onChooseTile(tileid);
  }
  
  /* "heal": Apply randomization and neighbor joining.
   *******************************************************************/
   
  fat5x3(p, x, y, family) {
    let neighbors = 0, mask = 0x80;
    for (let dy=-1; dy<=1; dy++) {
      const ny = y + dy;
      for (let dx=-1; dx<=1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        if ((nx >= 0) && (ny >= 0) && (nx < this.map.w) && (ny < this.map.h)) {
          const nfam = this.familyByTileid[this.map.v[ny * this.map.w + nx]];
          if (nfam === family) neighbors |= mask;
        } else {
          // Offscreen, pretend there *is* a neighbor.
          neighbors |= mask;
        }
        mask >>= 1;
      }
    }
    // Fully surrounded:
    if ((neighbors & 0xff) === 0xff) return family.tileid + 0x11;
    // One corner missing:
    if ((neighbors & 0xfe) === 0xfe) return family.tileid + 0x03;
    if ((neighbors & 0xfb) === 0xfb) return family.tileid + 0x04;
    if ((neighbors & 0xdf) === 0xdf) return family.tileid + 0x13;
    if ((neighbors & 0x7f) === 0x7f) return family.tileid + 0x14;
    // Edges:
    if ((neighbors & 0x1f) === 0x1f) return family.tileid + 0x01;
    if ((neighbors & 0x6b) === 0x6b) return family.tileid + 0x10;
    if ((neighbors & 0xd6) === 0xd6) return family.tileid + 0x12;
    if ((neighbors & 0xf8) === 0xf8) return family.tileid + 0x21;
    // Corners:
    if ((neighbors & 0x0b) === 0x0b) return family.tileid + 0x00;
    if ((neighbors & 0x16) === 0x16) return family.tileid + 0x02;
    if ((neighbors & 0x68) === 0x68) return family.tileid + 0x20;
    if ((neighbors & 0xd0) === 0xd0) return family.tileid + 0x22;
    // Anything else is a singleton. Choose between the two options balancedly.
    return family.tileid + ((Math.random() < 0.5) ? 0x23 : 0x24);
  }
   
  hotdog3x1(p, x, y, family) {
    // Same idea as fat5x3 but much simpler, there's only two neighbors that matter.
    const left = (x > 0) && (this.familyByTileid[this.map.v[p - 1]] === family);
    const right = (x < this.map.w - 1) && (this.familyByTileid[this.map.v[p + 1]] === family);
    if (left && right) return family.tileid + 0x01;
    if (left) return family.tileid + 0x02;
    return family.tileid + 0x00;
  }
   
  pillar1x3(p, x, y, family) {
    // Exactly the same as hotdog, but vertical.
    const top = (y > 0) && (this.familyByTileid[this.map.v[p - this.map.w]] === family);
    const bottom = (y < this.map.h - 1) && (this.familyByTileid[this.map.v[p + this.map.w]] === family);
    if (top && bottom) return family.tileid + 0x10;
    if (top) return family.tileid + 0x20;
    return family.tileid + 0x00;
  }
   
  healMotion1(x, y) {
    if ((x < 0) || (y < 0) || (x >= this.map.w) || (y >= this.map.h)) return false;
    const p = y * this.map.w + x;
    let tileid = this.map.v[p];
    const family = this.familyByTileid[tileid];
    if (!family) return false; // No props for this tile. That's fine, it just always will be placed verbatim.
    switch (family.mode) {
      case "balanced4x1": tileid = family.tileid + Math.floor(Math.random() * 4); break;
      case "fat5x3": tileid = this.fat5x3(p, x, y, family); break;
      case "hotdog3x1": tileid = this.hotdog3x1(p, x, y, family); break;
      case "pillar1x3": tileid = this.pillar1x3(p, x, y, family); break;
      default: throw new Error(`Tileprops mode ${JSON.stringify(family.mode)} not implemented at healMotion`);
    }
    if (tileid === this.map.v[p]) return false;
    this.map.v[p] = tileid;
    return true;
  }
   
  healMotion(forceBroadcast) {
    let dirty = false;
    for (let dy=-1; dy<=1; dy++) {
      for (let dx=-1; dx<=1; dx++) {
        if (this.healMotion1(this.mousex + dx, this.mousey + dy)) dirty = true;
      }
    }
    if (!forceBroadcast && !dirty) return;
    this.changedDuringStroke = true;
    this.broadcast({ id:"dirty" });
  }
  
  healBegin() {
    this.toolInProgress = "heal";
    this.healMotion();
  }
  
  /* Events from MapCanvas and MapToolbar.
   *********************************************************************/
   
  onMotion(x, y) {
    if ((x === this.mousex) && (y === this.mousey)) return;
    this.mousex = x;
    this.mousey = y;
    this.broadcast({ id:"motion", x, y });
    if ((x < 0) || (y < 0) || (x >= this.map.w) || (y >= this.map.h)) return;
    switch (this.toolInProgress) {
      case "verbatim": this.verbatimMotion(); break;
      case "rainbow": this.rainbowMotion(); break;
      case "monalisa": this.monalisaMotion(); break;
      // "pickup" could sensibly use motion, but i think not important
      case "heal": this.healMotion(); break;
    }
  }
  
  onMouseDown(button, x, y) {
    if (this.toolInProgress) return; // Your mouse has multiple buttons, but only one can be played at a time.
    this.changedDuringStroke = false;
    this.onMotion(x, y);
    if (!this.map) return; // No tool should run with initially-OOB coordinates, or without a map.
    if ((x < 0) || (x >= this.map.w)) return;
    if ((y < 0) || (y >= this.map.h)) return;
    this.anchorx = this.mousex;
    this.anchory = this.mousey;
    const tool = this.getToolForButton(button);
    switch (tool) {
      case "verbatim": this.verbatimBegin(); break;
      case "rainbow": this.rainbowBegin(); break;
      case "monalisa": this.monalisaBegin(); break;
      case "pickup": this.pickupBegin(); break;
      case "heal": this.healBegin(); break;
    }
  }
  
  onMouseUp(button, x, y) {
    this.onMotion(x, y);
    switch (this.toolInProgress) {
      //TODO... Actually we probably don't need any tool-specific "up" handlers.
    }
    this.toolInProgress = "";
    if (this.changedDuringStroke) {
      this.changedDuringStroke = false;
      this.broadcast({ id: "modify" });
    }
  }
  
  onModifiers(v) {
    if (v === this.modifiers) return;
    const prevTool0 = this.getToolForButton(0);
    const prevTool2 = this.getToolForButton(2);
    this.modifiers = v;
    const nextTool0 = this.getToolForButton(0);
    const nextTool2 = this.getToolForButton(2);
    if (prevTool0 !== nextTool0) this.broadcast({ id:"effectiveToolLeft", tool:nextTool0 });
    if (prevTool2 !== nextTool2) this.broadcast({ id:"effectiveToolRight", tool:nextTool2 });
  }
  
  onChooseTool(button, tool) {
    switch (button) {
      case 0: {
          if (tool === this.toolLeft) return;
          this.toolLeft = tool;
          this.broadcast({ id:"explicitToolLeft", tool });
          this.broadcast({ id:"effectiveToolLeft", tool:this.getToolForButton(0) });
        } break;
      case 2: {
          if (tool === this.toolRight) return;
          this.toolRight = tool;
          this.broadcast({ id:"explicitToolRight", tool });
          this.broadcast({ id:"effectiveToolRight", tool:this.getToolForButton(2) });
        } break;
    }
  }
  
  onChooseTile(tileid) {
    if (tileid === this.paletteTile) return;
    this.paletteTile = tileid;
    this.broadcast({ id: "paletteTile", tileid });
  }
  
  onResize(w, h, anchor) {
    if (!this.map) return;
    if ((w === this.map.w) && (h === this.map.h)) return;
    if ((w < 1) || (h < 1) || !w || !h) return;
    this.map.resize(w, h, anchor);
    this.broadcast({ id:"modify" });
  }
  
  setRenderTileSize(px) {
    if (px < 1) return;
    if (px === this.renderTileSize) return;
    this.renderTileSize = px;
    this.broadcast({ id:"renderTileSize" });
  }
  
  static digestTileprops() {
    const byTile = [];
    const fill = (tileid, w, h, family) => {
      const col = tileid & 0x0f;
      const row = tileid >> 4;
      if (col + w > 16) throw new Error(`invalid tileprops family ${family.mode} ${tileid}`);
      if (row + h > 16) throw new Error(`invalid tileprops family ${family.mode} ${tileid}`);
      for (let rowp=row*16+col; h-->0; rowp+=16) {
        for (let colp=rowp, xi=w; xi-->0; colp++) {
          if (byTile[colp]) throw new Error(`tileprops overlap at tile ${colp} (${family.mode} and ${byTile[colp].mode})`);
          byTile[colp] = family;
        }
      }
    };
    for (const family of MapPaintService.TILEPROPS) {
      switch (family.mode) {
        case "balanced4x1": fill(family.tileid, 4, 1, family); break;
        case "fat5x3": fill(family.tileid, 5, 3, family); break;
        case "hotdog3x1": fill(family.tileid, 3, 1, family); break;
        case "pillar1x3": fill(family.tileid, 1, 3, family); break;
        default: throw new Error(`Please add unpacking rules for tileprops mode ${JSON.stringify(family.mode)}`);
      }
    }
    return byTile;
  }
}

MapPaintService.singleton = true;

MapPaintService.MOD_SHIFT = 0x01;
MapPaintService.MOD_CONTROL = 0x02;
MapPaintService.MOD_ALT = 0x04;
MapPaintService.MOD_SUPER = 0x08;

MapPaintService.TOOLS = [{
  name: "verbatim",
  comment: "Replace map cell with the palette tile exactly.",
  mod: [{
    condition: MapPaintService.MOD_SHIFT,
    tool: "rainbow",
  }, {
    condition: MapPaintService.MOD_CONTROL,
    tool: "pickup",
  }],
}, {
  name: "rainbow",
  comment: "Replace map cell with randomization, then join neighbors.",
  mod: [{
    condition: MapPaintService.MOD_CONTROL,
    tool: "pickup",
  }],
}, {
  name: "monalisa",
  comment: "Replace the cell at mousedown, then use its neighbor from the tilesheet on drag. For large features.",
  mod: [{
    condition: MapPaintService.MOD_CONTROL,
    tool: "pickup",
  }],
}, {
  name: "pickup",
  comment: "Take this cell as the palette selection.",
  mod: [{
    condition: MapPaintService.MOD_CONTROL,
    tool: "verbatim",
  }],
}, {
  name: "heal",
  comment: "Reapply randomization and joining but keep the existing tile families.",
  mod: [{
    condition: MapPaintService.MOD_CONTROL,
    tool: "pickup",
  }],
}];
//TODO Select and move?
//TODO Metadata-editing tools?

/* Usually I make a generic "tileprops" resource type to describe tiles.
 * Since Too Heavy only has one tilesheet, we're hard-coding all the tile properties here.
 * Each entry in this list is a "family" of tiles, they consider each other neighbors and can swap out for each other.
 * The family's "mode" describes a hard-coded strategy for that substitution.
 */
MapPaintService.TILEPROPS = [{
  tileid: 0x01,
  mode: "balanced4x1",
}, {
  tileid: 0x0d,
  mode: "pillar1x3",
}, {
  tileid: 0x35,
  mode: "hotdog3x1",
}, {
  tileid: 0x45,
  mode: "hotdog3x1",
}, {
  tileid: 0x53,
  mode: "hotdog3x1",
}, {
  tileid: 0x80,
  mode: "fat5x3",
}, {
  tileid: 0xb0,
  mode: "fat5x3",
}, {
  tileid: 0xe0,
  mode: "hotdog3x1",
}, {
  tileid: 0xf0,
  mode: "hotdog3x1",
}];
