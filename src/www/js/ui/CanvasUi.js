/* CanvasUi.js
 * Owns the <canvas> element, and top level of responsbility for rendering.
 */
 
import { Game } from "../game/Game.js";
import { WordBubbler } from "./WordBubbler.js";

const TILESIZE = 16;
const CHRONFLAKE_COUNT = 100;
const CHRONFLAKE_TTL = 60; // frames; we don't get real time

export class CanvasUi {
  static getDependencies() {
    return [HTMLCanvasElement, Game];
  }
  constructor(element, game) {
    this.element = element;
    this.game = game;
    
    // RootUi should set this when configuration is in progress.
    this.inputConfigurationContext = null;
    
    this.wordBubbler = new WordBubbler(this);
    this.element.width = 320;
    this.element.height = 160;
    this.context = this.element.getContext("2d");
    this.context.drawDecal = (dstx, dsty, srcx, srcy, w, h, flop) => this.drawDecal(dstx, dsty, srcx, srcy, w, h, flop);
    this.context.drawDialogue = (focusx, focusy, text) => this.wordBubbler.draw(focusx, focusy, text);
    
    this.chronflakes = []; // {x,y,ttl} when time frozen
  }
  
  drawDecal(dstx, dsty, srcx, srcy, w, h, flop) {
    if (flop) {
      this.context.save();
      this.context.translate(dstx, dsty);
      this.context.scale(-1, 1);
      this.context.drawImage(this.game.graphics, srcx, srcy, w, h, -w, 0, w, h);
      this.context.restore();
    } else {
      this.context.drawImage(this.game.graphics, srcx, srcy, w, h, dstx, dsty, w, h);
    }
  }
  
  renderNow() {
    if (!this.game.menu || !this.game.menu.opaque) {
      if (this.game.scene.grid) {
        const worldBounds = this.game.scene.camera.getWorldBounds();
        this.fillSceneBackground(worldBounds);
        this.renderGrid(this.game.scene.grid, worldBounds);
        this.renderSprites(this.game.scene.sprites, worldBounds);
      
        /*XXX TEMP Show all physical borders *
        this.context.globalAlpha = 0.75;
        for (const sprite of this.game.scene.sprites) {
          if (!sprite.ph) continue;
          switch (sprite.ph.role) {
            case "fragile": this.context.fillStyle = "#ff0"; break;
            case "hazard": this.context.fillStyle = "#f00"; break;
            case "oneway": this.context.fillStyle = "#00f"; break;
            case "solid": this.context.fillStyle = "#840"; break;
            default: this.context.fillStyle = "#0f0"; break;
          }
          this.context.fillRect(sprite.ph.x - worldBounds.x + 1, sprite.ph.y - worldBounds.y + 1, sprite.ph.w - 2, sprite.ph.h - 2);
        }
        this.context.globalAlpha = 1;
        /**/
      
      } else {
        this.context.fillStyle = "#888";
        this.context.fillRect(0, 0, this.element.width, this.element.height);
      }
    }
    
    if (this.game.timeFrozen) {
      this.renderStoppedTime();
    } else {
      this.chronflakes = [];
    }
    
    if (this.game.menu) {
      this.game.menu.render(this.context, this.element);
    }
    
    if (this.game.paused) {
      this.context.fillStyle = "#000";
      this.context.globalAlpha = 0.75;
      this.context.fillRect(0, 0, this.element.width, this.element.height);
      this.context.globalAlpha = 1;
      
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
      this.context.fillStyle = "#000";
      this.context.fillRect(0, 0, this.element.width, this.element.height);
      this.context.fillStyle = this.game.scene.backgroundColor;
      this.context.fillRect(-worldBounds.x, -worldBounds.y, this.game.scene.worldw, this.game.scene.worldh);
    } else {
      // Camera fully within the world bounds -- typical -- fill framebuffer with backgroundColor.
      this.context.fillStyle = this.game.scene.backgroundColor;
      this.context.fillRect(0, 0, this.element.width, this.element.height);
    }
  }
  
  renderGrid(grid, worldBounds) {
    const cola = Math.max(0, Math.floor(worldBounds.x / TILESIZE));
    const rowa = Math.max(0, Math.floor(worldBounds.y / TILESIZE));
    const colz = Math.min(grid.w - 1, Math.floor((worldBounds.x + worldBounds.w) / TILESIZE));
    const rowz = Math.min(grid.h - 1, Math.floor((worldBounds.y + worldBounds.h) / TILESIZE));
    let dsty = rowa * TILESIZE - worldBounds.y;
    const dstx0 = cola * TILESIZE - worldBounds.x;
    let rowp = rowa * grid.w + cola;
    for (let row=rowa; row<=rowz; row++, dsty+=TILESIZE, rowp+=grid.w) {
      for (let col=cola, dstx=dstx0, colp=rowp; col<=colz; col++, dstx+=TILESIZE, colp++) {
        if (!grid.v[colp]) continue; // Tile zero should always be blank, and common. Don't bother rendering.
        this.renderGridTile(dstx, dsty, grid.v[colp]);
      }
    }
  }
  
  renderGridTile(dstx, dsty, v) {
    const srcx = (v & 0x0f) * TILESIZE;
    const srcy = (v >> 4) * TILESIZE;
    this.context.drawImage(this.game.graphics, srcx, srcy, TILESIZE, TILESIZE, dstx, dsty, TILESIZE, TILESIZE);
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
        sprite.postRender(this.context, sbounds.x - worldBounds.x, sbounds.y - worldBounds.y, sbounds);
      }
    }
  }
  
  renderSprite(sprite, dstx, dsty, sbounds) {
    if (sprite.render) {
      sprite.render(this.context, dstx, dsty);
    } else {
      if (sprite.flop) {
        this.context.save();
        this.context.translate(dstx, dsty);
        this.context.scale(-1, 1);
        this.context.drawImage(this.game.graphics, sprite.srcx, sprite.srcy, sbounds.w, sbounds.h, -sbounds.w, 0, sbounds.w, sbounds.h);
        this.context.restore();
      } else {
        this.context.drawImage(this.game.graphics, sprite.srcx, sprite.srcy, sbounds.w, sbounds.h, dstx, dsty, sbounds.w, sbounds.h);
      }
    }
  }
  
  renderStoppedTime() {
    while (this.chronflakes.length < CHRONFLAKE_COUNT) {
      this.chronflakes.push({
        x: Math.floor(Math.random() * this.element.width),
        y: Math.floor(Math.random() * this.element.height),
        ttl: Math.ceil(Math.random() * CHRONFLAKE_TTL),
      });
    }
    const halfttl = CHRONFLAKE_TTL >> 1;
    const alphamax = 0.5;
    const radius = 2;
    this.context.fillStyle = "#fff";
    for (const chronflake of this.chronflakes) {
      if (chronflake.ttl > 0) {
        chronflake.ttl--;
        this.context.beginPath();
        this.context.ellipse(chronflake.x, chronflake.y, radius, radius, 0, 0, Math.PI * 2);
        if (chronflake.ttl >= halfttl) {
          this.context.globalAlpha = ((CHRONFLAKE_TTL - chronflake.ttl) * alphamax) / halfttl;
        } else {
          this.context.globalAlpha = (chronflake.ttl * alphamax) / halfttl;
        }
        this.context.fill();
      } else {
        chronflake.x = Math.floor(Math.random() * this.element.width);
        chronflake.y = Math.floor(Math.random() * this.element.height);
        chronflake.ttl = CHRONFLAKE_TTL;
      }
    }
    this.context.globalAlpha = 1.0;
  }
}
