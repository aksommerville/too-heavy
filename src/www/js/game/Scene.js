/* Scene.js
 * Game model, stripped of all interface concerns.
 * Originally a Scene was roughly bound to a Grid: Go through a door, we make a new Scene.
 * That got a bit inconvenient, so now Scene is a singleton and is basically part of Game.
 */
 
import { Injector } from "../core/Injector.js";
import { Camera } from "./Camera.js";
import { Grid } from "./Grid.js";
import { Sprite } from "./Sprite.js";
import { Physics } from "./Physics.js";
import { DataService } from "./DataService.js";
import { HeroSprite } from "./sprites/HeroSprite.js";
import { ProximityRevealSprite } from "./sprites/ProximityRevealSprite.js";
import { BreakableSprite } from "./sprites/BreakableSprite.js";
import { CrusherSprite } from "./sprites/CrusherSprite.js";
import { PlatformSprite } from "./sprites/PlatformSprite.js";
import { SwitchSprite } from "./sprites/SwitchSprite.js";
import { BlockSprite } from "./sprites/BlockSprite.js";

const TILESIZE = 16;
 
export class Scene {
  static getDependencies() {
    return [/*Game,*/ Physics, DataService];
  }
  constructor(/*game,*/ physics, dataService) {
    this.game = null; // owner must provide
    this.physics = physics;
    this.dataService = dataService;
    
    this.physics.scene = this;
    
    this.backgroundColor = "#66bbff";
    this.grid = null; // Grid
    this.sprites = []; // Sprite
    this.camera = new Camera(this);
    this.doors = []; // {x,y,w,h,dstmapid,dstx,dsty} (x,y,w,h) in pixels, (dstx,dsty) in cells.
    this.edgeDoors = []; // {x,y,w,h,dstmapid,offx,offy} all in pixels. we generate a rectangle that goes way offscreen
    this.spawnAtEntranceOnly = false;
    this.timeSinceLoad = 0;
    this.worldw = 0;
    this.worldh = 0;
    this.transientState = {};
    
    // HeroSprite should set these after it updates each time, for other sprites to observe.
    this.herox = 0;
    this.heroy = 0;
    this.herocol = 0;
    this.herorow = 0;
  }
  
  update(elapsed, inputState) {
    this.timeSinceLoad += elapsed;
    for (const sprite of this.sprites) {
      if (this.game.timeFrozen && !(sprite instanceof HeroSprite)) continue;
      sprite.update?.(elapsed, inputState);
    }
    this.physics.update(elapsed);
  }
  
  removeSprite(sprite) {
    if (!sprite) return;
    const p = this.sprites.indexOf(sprite);
    if (p < 0) return;
    this.sprites.splice(p, 1);
  }
  
  load(mapid, hero, door) {
    if (!(this.grid = this.dataService.getResourceSync("map", mapid))) throw new Error(`Failed to load map:${mapid}`);
    this.sprites = [];
    this.doors = [];
    this.edgeDoors = [];
    this.camera.cutNext = true;
    this.spawnAtEntranceOnly = false;
    this.timeSinceLoad = 0;
    
    /* If we were given a hero sprite, keep it.
     * And if there's also a door (or edgeDoor), adjust the hero's position accordingly.
     * (worldw,worldh) have not been replaced yet. That's important -- they're the dimensions of the map we're coming from, need for edge doors.
     */
    if (hero) {
      this.sprites.push(hero);
      if (door) {
        switch (door.edge) {
          case "w": hero.x += this.grid.w * TILESIZE + door.offx; hero.y += door.offy; break;
          case "e": hero.x -= this.worldw + door.offx; hero.y += door.offy; break;
          case "n": hero.x += door.offx; hero.y += this.grid.h * TILESIZE + door.offy; break;
          case "s": hero.x += door.offx; hero.y -= this.worldh + door.offy; break;
          default: { // no "edge", must be a plain door with (dstx,dsty)
              hero.x = (door.dstx + 0.5) * TILESIZE;
              hero.y = (door.dsty + 1) * TILESIZE;
            }
        }
        this.physics.warp(hero);
      }
    }
    
    for (const cmd of this.grid.meta) {
      switch (cmd[0]) {
        case "door": { // X Y W H DSTMAPID DSTX DSTY
            this.doors.push({
              x: +cmd[1] * TILESIZE,
              y: +cmd[2] * TILESIZE,
              w: +cmd[3] * TILESIZE,
              h: +cmd[4] * TILESIZE,
              dstmapid: +cmd[5],
              dstx: +cmd[6],
              dsty: +cmd[7],
            });
          } break;
        case "edgedoor": { // EDGE P C DSTMAPID OFFSET
            let x, y, w=1000, h=1000, offx=0, offy=0;
            switch (cmd[1]) {
              case "w": {
                  x = -1000;
                  y = +cmd[2] * TILESIZE;
                  h = +cmd[3] * TILESIZE;
                  offy = +cmd[5] * TILESIZE;
                } break;
              case "e": {
                  x = this.w * TILESIZE;
                  y = +cmd[2] * TILESIZE;
                  h = +cmd[3] * TILESIZE;
                  offy = +cmd[5] * TILESIZE;
                } break;
              case "n": {
                  y = -1000;
                  x = +cmd[2] * TILESIZE;
                  w = +cmd[3] * TILESIZE;
                  offx = +cmd[5] * TILESIZE;
                } break;
              case "s": {
                  y = this.h * TILESIZE;
                  x = +cmd[2] * TILESIZE;
                  w = +cmd[3] * TILESIZE;
                  offx = +cmd[5] * TILESIZE;
                } break;
            }
            this.edgeDoors.push({
              x, y, w, h,
              dstmapid: +cmd[4],
              offx, offy,
              edge: cmd[1],
            });
          } break;
        case "hero": if (!hero) { // X Y
            hero = new HeroSprite(this);
            hero.x = (+cmd[1] + 0.5) * TILESIZE;
            hero.y = (+cmd[2] + 1) * TILESIZE; // hero's focus point is at the bottom, we happen to know
            this.sprites.push(hero);
          } break;
        case "sprite": { // X Y SPRITEID [ARGS...]
            const sprite = this.createSpriteFromGridCommand(cmd);
            this.sprites.push(sprite);
          } break;
        case "spawnAtEntranceOnly": {
            this.spawnAtEntranceOnly = true;
          } break;
      }
    }
    
    for (const sprite of this.grid.generateStaticSprites(this)) {
      this.sprites.push(sprite);
    }
    this.worldw = this.grid.w * TILESIZE;
    this.worldh = this.grid.h * TILESIZE;
  }
  
  createSpriteFromGridCommand(cmd) { // sprite X Y SPRITEID [ARGS...]
    const col = +cmd[1];
    const row = +cmd[2];
    if (isNaN(col) || isNaN(row)) {
      throw new Error(`Invalid sprite command: ${JSON.stringify(cmd)}`);
    }
    const spriteId = cmd[3];
    switch (spriteId) {
      // spriteId is the class name and could be resolved dynamically, but don't: That would be a potential security hole.
      case "ProximityRevealSprite": return new ProximityRevealSprite(this, col, row, cmd.slice(4));
      case "BreakableSprite": return new BreakableSprite(this, col, row, cmd.slice(4));
      case "CrusherSprite": return new CrusherSprite(this, col, row, cmd.slice(4));
      case "PlatformSprite": return new PlatformSprite(this, col, row, cmd.slice(4));
      case "SwitchSprite": return new SwitchSprite(this, col, row, cmd.slice(4));
      case "BlockSprite": return new BlockSprite(this, col, row, cmd.slice(4));
    }
    throw new Error(`Unknown spriteId ${JSON.stringify(spriteId)}`);
  }
  
  sortSpritesForRender() {
    this.sprites.sort((a, b) => a.layer - b.layer);
  }
  
  deliverTransientState(k, v) {
    for (const sprite of this.sprites) {
      if (sprite.onTransientState) sprite.onTransientState(k, v);
    }
    this.transientState[k] = v;
  }
  
  clearTransientState() {
    for (const k of Object.keys(this.transientState)) {
      const v = this.transientState[k];
      if (!v) continue; // they all start null, and let's declare all false values equivalent. they're normally boolean.
      for (const sprite of this.sprites) {
        if (sprite.onTransientState) sprite.onTransientState(k, false);
      }
    }
    this.transientState = {};
  }
}
