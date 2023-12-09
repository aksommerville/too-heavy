/* CanvasUi.js
 * Owns the <canvas> element, and top level of responsbility for rendering.
 */
 
import { Game } from "../game/Game.js";

const TILESIZE = 16;

export class CanvasUi {
  static getDependencies() {
    return [HTMLCanvasElement, Game];
  }
  constructor(element, game) {
    this.element = element;
    this.game = game;
    
    this.element.width = 320;
    this.element.height = 160;
    this.context = this.element.getContext("2d");
  }
  
  renderNow() {
    if (this.game.scene) {
      this.context.fillStyle = this.game.scene.backgroundColor;
      this.context.fillRect(0, 0, this.element.width, this.element.height);
      const worldBounds = this.game.scene.camera.getWorldBounds();
      if (this.game.scene.grid) this.renderGrid(this.game.scene.grid, worldBounds);
      this.renderSprites(this.game.scene.sprites, worldBounds);
      
    } else {
      this.context.fillStyle = "#888";
      this.context.fillRect(0, 0, this.element.width, this.element.height);
    }
    
    if (this.game.paused) {
      this.context.fillStyle = "#000";
      this.context.globalAlpha = 0.75;
      this.context.fillRect(0, 0, this.element.width, this.element.height);
      this.context.globalAlpha = 1;
      this.context.fillStyle = "#fff";
      this.context.font = "24px sans-serif";
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";
      this.context.fillText("Click to resume", this.element.width >> 1, this.element.height >> 1);
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
    for (const sprite of sprites) {
      const sbounds = sprite.getRenderBounds();
      if (sbounds.x >= worldRight) continue;
      if (sbounds.y >= worldBottom) continue;
      if (sbounds.x + sbounds.w <= worldBounds.x) continue;
      if (sbounds.y + sbounds.h <= worldBounds.y) continue;
      this.renderSprite(sprite, sbounds.x - worldBounds.x, sbounds.y - worldBounds.y, sbounds);
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
}
