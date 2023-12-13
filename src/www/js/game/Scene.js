/* Scene.js
 * Game model, stripped of all interface concerns.
 * Originally a Scene was roughly bound to a Grid: Go through a door, we make a new Scene.
 * That got a bit inconvenient, so now Scene is a singleton and is basically part of Game.
 */
 
import { Injector } from "../core/Injector.js";
import { Camera } from "./Camera.js";
import { Grid } from "./Grid.js";
import { Sprite } from "./Sprite.js";
import { HeroSprite } from "./sprites/HeroSprite.js";
import { Physics } from "./Physics.js";
import { DataService } from "./DataService.js";

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
  }
  
  update(elapsed, inputState) {
    for (const sprite of this.sprites) sprite.update?.(elapsed, inputState);
    this.physics.update(elapsed);
  }
  
  removeSprite(sprite) {
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
            //TODO
          } break;
      }
    }
    
    for (const sprite of this.grid.generateStaticSprites(this)) {
      this.sprites.push(sprite);
    }
    this.worldw = this.grid.w * TILESIZE;
    this.worldh = this.grid.h * TILESIZE;
  }
}

Scene.singleton = true;

export class SceneFactory {
  static getDependencies() {
    return [Injector, DataService];
  }
  constructor(injector, dataService) {
    this.injector = injector;
    this.dataService = dataService;
  }
  
  begin(sceneId) {
    const scene = this.injector.get(Scene);
    if (!(scene.grid = this.dataService.getResourceSync("map", sceneId))) throw new Error(`Failed to load map:${sceneId}`);
    
    for (const cmd of scene.grid.meta) {
      switch (cmd[0]) {
        case "door": { // X Y W H DSTMAPID DSTX DSTY
            scene.doors.push({
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
            scene.edgeDoors.push({
              x, y, w, h,
              dstmapid: +cmd[4],
              offx, offy,
            });
          } break;
        case "hero": { // X Y
            //TODO skip if we have a hero carried over from prior scene -- how is that going to work?
            const hero = new HeroSprite(scene);
            hero.x = (+cmd[1] + 0.5) * TILESIZE;
            hero.y = (+cmd[2] + 1) * TILESIZE; // hero's focus point is at the bottom, we happen to know
            scene.sprites.push(hero);
          } break;
        case "sprite": { // X Y SPRITEID [ARGS...]
            //TODO
          } break;
      }
    }
    
    for (const sprite of scene.grid.generateStaticSprites(scene)) {
      scene.sprites.push(sprite);
    }
    scene.worldw = scene.grid.w * TILESIZE;
    scene.worldh = scene.grid.h * TILESIZE;
    return scene;
  }
}

SceneFactory.singleton = true;
