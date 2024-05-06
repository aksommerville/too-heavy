/* CanvasUi.js
 */
 
import { Game } from "../game/Game.js";
import { WordBubbler } from "./WordBubbler.js";
import { TILESIZE } from "../constants.js";

const CHRONFLAKE_COUNT = 100;
const CHRONFLAKE_TTL = 60; // frames; we don't get real time

export class CanvasUi {
  static getDependencies() {
    return [Game];//HTMLCanvasElement, Game];
  }
  constructor(game) {
    this.game = game;
    
    // RootUi should set this when configuration is in progress.
    this.inputConfigurationContext = null;
    
    const hdr = egg.texture_get_header(1);
    this.screenw = hdr.w;
    this.screenh = hdr.h;
    this.dsttexid = 1;
    
    this.wordBubbler = new WordBubbler(this);
    this.drawDialogue = (focusx, focusy, text) => this.wordBubbler.draw(focusx, focusy, text);
    
    this.chronflakes = []; // {x,y,ttl} when time frozen
    this.tiles = null; // Uint8Array; allocated lazy
  }
  
  drawDecal(dstx, dsty, srcx, srcy, w, h, flop) {
    egg.draw_decal(
      this.dsttexid, this.game.graphicsTexid,
      dstx, dsty, srcx, srcy, w, h,
      flop ? 0x01 : 0
    );
  }
  
  renderNow() {
    if (!this.game.menu || !this.game.menu.opaque) {
      if (this.game.scene.grid) {
        const worldBounds = this.game.scene.camera.getWorldBounds();
        this.fillSceneBackground(worldBounds);
        this.renderGrid(this.game.scene.grid, worldBounds);
        this.renderSprites(this.game.scene.sprites, worldBounds);
      } else {
        egg.draw_rect(1, 0, 0, this.screenw, this.screenh, 0x888888ff);
      }
    }
    
    if (this.game.timeFrozen) {
      this.renderStoppedTime();
    } else {
      this.chronflakes = [];
    }
    
    if (this.game.menu) {
      this.game.menu.render(this);
    }
    
    if (this.game.paused) {
      egg.draw_rect(1, 0, 0, this.screenw, this.screenh, 0x000000c0);
      
      /*XXX Decide how bad we want this:
      this.context.fillStyle = "#fff";
      this.context.font = "24px sans-serif";
      this.context.textAlign = "center";
      this.context.textBaseline = "top";
      this.context.fillText("~ PAUSED ~", this.element.width >> 1, 10);
      
      if (this.inputConfigurationContext) {
        this.context.textBaseline = "center";
        this.context.fillText(this.inputConfigurationContext.message, this.element.width >> 1, this.element.height >> 1);
      
      } else {
        this.context.font = "12px sans-serif";
        this.context.textAlign = "left";
        this.context.textBaseline = "bottom";
        this.context.fillText("F1 (at any time) to configure input.", 10, this.element.height - 10);
        this.context.fillText("Click to resume.", 10, this.element.height - 25);
      }
      /**/
    }
  }
  
  fillSceneBackground(worldBounds) {
    if (
      (worldBounds.x < 0) ||
      (worldBounds.y < 0) ||
      (worldBounds.x + worldBounds.w > this.game.scene.worldw) ||
      (worldBounds.y + worldBounds.h > this.game.scene.worldh)
    ) {
      // Camera goes offscreen. Black for the OOB space, and backgroundColor for the valid space.
      egg.draw_rect(1, 0, 0, this.screenw, this.screenh, 0x000000ff);
      egg.draw_rect(1, -worldBounds.x, -worldBounds.y, this.game.scene.worldw, this.game.scene.worldh, this.game.scene.backgroundColor);
    } else {
      // Camera fully within the world bounds -- typical -- fill framebuffer with backgroundColor.
      egg.draw_rect(1, 0, 0, this.screenw, this.screenh, this.game.scene.backgroundColor);
    }
    /**/
  }
  
  renderGrid(grid, worldBounds) {
    const cola = Math.max(0, Math.floor(worldBounds.x / TILESIZE));
    const rowa = Math.max(0, Math.floor(worldBounds.y / TILESIZE));
    const colz = Math.min(grid.w - 1, Math.floor((worldBounds.x + worldBounds.w) / TILESIZE));
    const rowz = Math.min(grid.h - 1, Math.floor((worldBounds.y + worldBounds.h) / TILESIZE));
    const tilec = (colz - cola + 1) * (rowz - rowa + 1);
    if (tilec < 1) return;
    this.requireTiles(tilec);
    let tilesp = 0;
    let dsty = rowa * TILESIZE - worldBounds.y + (TILESIZE >> 1);
    const dstx0 = cola * TILESIZE - worldBounds.x + (TILESIZE >> 1);
    let rowp = rowa * grid.w + cola;
    for (let row=rowa; row<=rowz; row++, dsty+=TILESIZE, rowp+=grid.w) {
      for (let col=cola, dstx=dstx0, colp=rowp; col<=colz; col++, dstx+=TILESIZE, colp++) {
        if (!grid.v[colp]) continue; // Tile zero should always be blank, and common. Don't bother rendering.
        this.tiles[tilesp++] = dstx;
        this.tiles[tilesp++] = dstx >> 8;
        this.tiles[tilesp++] = dsty;
        this.tiles[tilesp++] = dsty >> 8;
        this.tiles[tilesp++] = grid.v[colp];
        this.tiles[tilesp++] = 0;
      }
    }
    egg.draw_tile(1, this.game.tilesheetTexid, this.tiles.buffer, tilesp / 6);
  }
  
  requireTiles(c) {
    if (!this.tiles || (c > this.tiles.length / 6)) {
      this.tiles = new Uint8Array(c * 6);
    }
  }
  
  renderSprites(sprites, worldBounds) {
    const worldRight = worldBounds.x + worldBounds.w;
    const worldBottom = worldBounds.y + worldBounds.h;
    let havePost = false;
    for (const sprite of sprites) {
      const sbounds = sprite.getRenderBounds();
      if (!sprite.renderAlways) {
        if (sbounds.x >= worldRight) continue;
        if (sbounds.y >= worldBottom) continue;
        if (sbounds.x + sbounds.w <= worldBounds.x) continue;
        if (sbounds.y + sbounds.h <= worldBounds.y) continue;
      }
      this.renderSprite(sprite, sbounds.x - worldBounds.x, sbounds.y - worldBounds.y, sbounds);
      if (sprite.postRender) havePost = true;
    }
    if (havePost) {
      for (const sprite of sprites) {
        if (!sprite.postRender) continue;
        const sbounds = sprite.getRenderBounds();
        if (!sprite.renderAlways) {
          if (sbounds.x >= worldRight) continue;
          if (sbounds.y >= worldBottom) continue;
          if (sbounds.x + sbounds.w <= worldBounds.x) continue;
          if (sbounds.y + sbounds.h <= worldBounds.y) continue;
        }
        sprite.postRender(this, sbounds.x - worldBounds.x, sbounds.y - worldBounds.y, sbounds);
      }
    }
  }
  
  renderSprite(sprite, dstx, dsty, sbounds) {
    if (sprite.render) {
      sprite.render(this, dstx, dsty);
    } else {
      egg.draw_decal(
        1, this.game.graphicsTexid,
        dstx, dsty,
        sprite.srcx, sprite.srcy,
        sbounds.w, sbounds.h,
        sprite.flop ? 0x01 : 0
      );
    }
  }
  
  renderStoppedTime() {
    while (this.chronflakes.length < CHRONFLAKE_COUNT) {
      this.chronflakes.push({
        x: Math.floor(Math.random() * this.screenw),
        y: Math.floor(Math.random() * this.screenh),
        ttl: Math.ceil(Math.random() * CHRONFLAKE_TTL),
      });
    }
    const halfttl = CHRONFLAKE_TTL >> 1;
    const alphamax = 0.5;
    const radius = 2;
    //this.context.fillStyle = "#fff";
    for (const chronflake of this.chronflakes) {
      if (chronflake.ttl > 0) {
        chronflake.ttl--;
        /*TODO Imitate this more closely:
        this.context.beginPath();
        this.context.ellipse(chronflake.x, chronflake.y, radius, radius, 0, 0, Math.PI * 2);
        if (chronflake.ttl >= halfttl) {
          this.context.globalAlpha = ((CHRONFLAKE_TTL - chronflake.ttl) * alphamax) / halfttl;
        } else {
          this.context.globalAlpha = (chronflake.ttl * alphamax) / halfttl;
        }
        this.context.fill();
        /**/
        egg.draw_rect(1, chronflake.x, chronflake.y, 3, 3, 0xffffff80);
      } else {
        chronflake.x = Math.floor(Math.random() * this.screenw);
        chronflake.y = Math.floor(Math.random() * this.screenh);
        chronflake.ttl = CHRONFLAKE_TTL;
      }
    }
    //this.context.globalAlpha = 1.0;
  }
}

CanvasUi.singleton = true;
