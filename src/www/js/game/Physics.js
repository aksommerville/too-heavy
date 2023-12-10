/* Physics.js
 * There's a new Physics instance for each Scene, owned by the Scene.
 * We're responsible for rectifying Sprite positions.
 *
 * All participating sprites get a member "ph":
 * {
 * Constant, or close to:
 *   invmass: 0..1 ; 0 means absolutely immobile.
 *   pleft,ptop ; corner of hit box relative to sprite's (x,y).
 *   edges: boolean ; true to prevent movement off screen.
 *   gravity: boolean ; true to fall automatically.
 * Volatile:
 *   x,y,w,h ; (x,y) are managed by Physics.
 *   pvx,pvy ; last known position
 *   gravityRate ; px/sec, increases as you fall
 *   adjusted: boolean
 * }
 */
 
const GRAVITY_ACCELERATION = 400; // px/sec**2
const GRAVITY_MIN = 50; // px/sec
const GRAVITY_MAX = 300; // px/sec
 
export class Physics {

  static prepareSprite(sprite) {
    sprite.ph = {
      invmass: 0.5,
      pleft: 0,
      ptop: 0,
      edges: false,
      gravity: true,
      w: 16,
      h: 16,
      x: 0,
      y: 0,
      pvx: 0,
      pvy: 0,
      gravityRate: 0,
      adjusted: false,
    };
  }

  /* How far can (sprite) move in direction (dx,dy) before colliding with something?
   * (limit) is a hint that we can stop looking beyond that magnitude. We might return more.
   * One of (dx,dy) must be zero and the other nonzero.
   */
  measureFreedom(sprite, dx, dy, limit) {
    if (!sprite.ph) return limit;
    if (!sprite.ph.invmass) return 0;
    sprite.ph.x = sprite.x + sprite.ph.pleft;
    sprite.ph.y = sprite.y + sprite.ph.ptop;
    
    // Decide how to measure distance to a sprite...
    let distance;
    if (dx < 0) {
      const front = sprite.ph.x;
      const back = front + sprite.ph.w;
      const top = sprite.ph.y;
      const bottom = top + sprite.ph.h;
      if (sprite.ph.edges) {
        if (front < limit) limit = front;
      }
      distance = (other) => {
        if (!other.ph) return limit;
        other.ph.x = other.x + other.ph.pleft;
        other.ph.y = other.y + other.ph.ptop;
        if (other.ph.y >= bottom) return limit;
        if (other.ph.y + other.ph.h <= top) return limit;
        if (other.ph.x >= back) return limit;
        return front - other.ph.w - other.ph.x;
      };
    } else if (dx > 0) {
      const back = sprite.ph.x;
      const front = back + sprite.ph.w;
      const top = sprite.ph.y;
      const bottom = top + sprite.ph.h;
      if (sprite.ph.edges) {
        const q = this.scene.worldw - front;
        if (q < limit) limit = q;
      }
      distance = (other) => {
        if (!other.ph) return limit;
        other.ph.x = other.x + other.ph.pleft;
        other.ph.y = other.y + other.ph.ptop;
        if (other.ph.y >= bottom) return limit;
        if (other.ph.y + other.ph.h <= top) return limit;
        if (other.ph.x + other.ph.w <= back) return limit;
        return other.ph.x - front;
      };
    } else if (dy < 0) {
      const front = sprite.ph.y;
      const back = front + sprite.ph.h;
      const left = sprite.ph.x;
      const right = left + sprite.ph.w;
      if (sprite.ph.edges) {
        if (front < limit) limit = front;
      }
      distance = (other) => {
        if (!other.ph) return limit;
        other.ph.x = other.x + other.ph.pleft;
        other.ph.y = other.y + other.ph.ptop;
        if (other.ph.x >= right) return limit;
        if (other.ph.x + other.ph.w <= left) return limit;
        if (other.ph.y >= back) return limit;
        return front - other.ph.h - other.ph.y;
      };
    } else if (dy > 0) {
      const back = sprite.ph.y;
      const front = back + sprite.ph.h;
      const left = sprite.ph.x;
      const right = left + sprite.ph.w;
      if (sprite.ph.edges) {
        const q = this.scene.worldh - front;
        if (q < limit) limit = q;
      }
      distance = (other) => {
        if (!other.ph) return limit;
        other.ph.x = other.x + other.ph.pleft;
        other.ph.y = other.y + other.ph.ptop;
        if (other.ph.x >= right) return limit;
        if (other.ph.x + other.ph.w <= left) return limit;
        if (other.ph.y + other.ph.h <= back) return limit;
        return other.ph.y - front;
      };
    } else return 0;
    
    if (limit <= 0) return 0;
    for (const other of this.scene.sprites) {
      if (other === sprite) continue;
      const q = distance(other);
      if (q <= 0) return 0;
      if (q < limit) limit = q;
    }
      
    return limit;
  }
  
  /* Given (sprite) with a dirty (x,y), Estimate how much of the sprite overlaps others.
   * Returns 0..1 = valid .. completely overlapped.
   */
  testSpritePosition(sprite) {
    if (!sprite.ph) return 0;
    sprite.ph.pvx = sprite.ph.x;
    sprite.ph.pvy = sprite.ph.y;
    sprite.ph.x = sprite.x + sprite.ph.pleft;
    sprite.ph.y = sprite.y + sprite.ph.ptop;
    let overlap = 0;
    
    if (sprite.ph.edges) {
      if (sprite.ph.x < 0) overlap += -sprite.ph.x / sprite.ph.w;
      else if (sprite.ph.x + sprite.ph.w > this.scene.worldw) {
        overlap += (sprite.ph.x + sprite.ph.w - this.scene.worldw) / sprite.ph.w;
      }
      if (sprite.ph.y < 0) overlap += -sprite.ph.y / sprite.ph.h;
      else if (sprite.ph.y + sprite.ph.h > this.scene.worldh) {
        overlap += (sprite.ph.y + sprite.ph.h - this.scene.worldh) / sprite.ph.h;
      }
      if (overlap >= 1) return 1;
    }
    
    const area = sprite.ph.w * sprite.ph.h;
    for (const other of this.scene.sprites) {
      if (!other.ph) continue;
      if (other === sprite) continue;
      other.ph.x = other.x + other.ph.pleft;
      other.ph.y = other.y + other.ph.ptop;
      const xlo = Math.max(sprite.ph.x, other.ph.x);
      const xhi = Math.min(sprite.ph.x + sprite.ph.w, other.ph.x + other.ph.w);
      if (xlo >= xhi) continue;
      const ylo = Math.max(sprite.ph.y , other.ph.y);
      const yhi = Math.min(sprite.ph.y + sprite.ph.h, other.ph.y + other.ph.h);
      if (ylo >= yhi) continue;
      overlap += ((xhi - xlo) * (yhi - ylo)) / area;
    }
    if (overlap <= 0) return 0;
    if (overlap >= 1) return 1;
    return overlap;
  }

  /* Called by scene each frame, after updates.
   */
  update(elapsed) {
  
    // Determine which sprites are participating and sort them into "active" and "passive".
    // Active sprites are ones that can move.
    const active = [], passive = [];
    for (const sprite of this.scene.sprites) {
      if (!sprite.ph) continue;
      sprite.ph.pvx = sprite.ph.x;
      sprite.ph.pvy = sprite.ph.y;
      sprite.ph.x = sprite.x + sprite.ph.pleft;
      sprite.ph.y = sprite.y + sprite.ph.ptop;
      sprite.ph.adjusted = false;
      if (sprite.ph.invmass > 0) active.push(sprite);
      else passive.push(sprite);
    }
    
    // Apply gravity to active sprites.
    for (const sprite of active) {
      if (!sprite.ph.gravity) continue;
      if (sprite.ph.gravityRate) sprite.ph.gravityRate += elapsed * GRAVITY_ACCELERATION;
      else sprite.ph.gravityRate = GRAVITY_MIN;
      if (sprite.ph.gravityRate > GRAVITY_MAX) sprite.ph.gravityRate = GRAVITY_MAX;
      sprite.ph.y += sprite.ph.gravityRate * elapsed;
      sprite.ph.adjusted = true;
    }
    
    // Among active sprites, compare to edges and passives, then to other actives.
    for (let ai=active.length; ai-->0; ) {
      const sprite = active[ai];
      
      if (sprite.ph.edges) {
        if (sprite.ph.x < 0) {
          sprite.ph.x = 0;
          sprite.ph.adjusted = true;
        } else if (sprite.ph.x + sprite.ph.w > this.scene.worldw) {
          sprite.ph.x = this.scene.worldw - sprite.ph.w;
          sprite.ph.adjusted = true;
        }
        if (sprite.ph.y < 0) {
          sprite.ph.y = 0;
          sprite.ph.adjusted = true;
        } else if (sprite.ph.y + sprite.ph.h > this.scene.worldh) {
          sprite.ph.y = this.scene.worldh - sprite.ph.h;
          sprite.ph.adjusted = true;
        }
      }
      
      for (const other of passive) {
        this.collideSprites(sprite, other);
      }
      
      for (const other of active) {
        if (other === sprite) continue;
        this.collideSprites(sprite, other);
      }
    }
    
    // Where gravity was applied, check footroom and reset it if we're on the ground now.
    // It's important to do this *after* all the collision checks.
    for (const sprite of active) {
      if (!sprite.ph.gravity) continue;
      sprite.x = sprite.ph.x - sprite.ph.pleft;
      sprite.y = sprite.ph.y - sprite.ph.ptop;
      const footroom = this.measureFreedom(sprite, 0, 1, 999);
      if (footroom <= 0) {
        sprite.ph.gravityRate = 0;
      }
    }
    
    // Anything that adjusted, update its natural (x,y).
    for (const sprite of active) {
      if (!sprite.ph.adjusted) continue;
      sprite.x = sprite.ph.x - sprite.ph.pleft;
      sprite.y = sprite.ph.y - sprite.ph.ptop;
    }
  }
  
  /* Check for collision between two sprites and if it exists, update their positions to escape it.
   * Caller must ensure that at least one of (a,b) has a positive invmass.
   */
  collideSprites(a, b) {
    if (a.ph.x >= b.ph.x + b.ph.w) return;
    if (a.ph.y >= b.ph.y + b.ph.h) return;
    if (a.ph.x + a.ph.w <= b.ph.x) return;
    if (a.ph.y + a.ph.h <= b.ph.y) return;
    const aweight = a.ph.invmass / (a.ph.invmass + b.ph.invmass);
    const bweight = 1 - aweight;
    
    // Measure (a)'s escapement in each of the cardinal directions.
    // Of course we don't know whether the escaped position is actually valid, that's kind of a fundamental weakness of this engine...
    const escl = a.ph.x + a.ph.w - b.ph.x;
    const escr = b.ph.x + b.ph.w - a.ph.x;
    const esct = a.ph.y + a.ph.h - b.ph.y;
    const escb = b.ph.y + b.ph.h - a.ph.y;
    let dx = 0, dy = 0;
    if ((escl <= escr) && (escl <= esct) && (escl <= escb)) dx = -escl;
    else if ((escr <= esct) && (escr <= escb)) dx = escr;
    else if (esct <= escb) dy = -esct;
    else dy = escb;
    
    // When (b) is static, don't risk rounding errors from (dx * aweight) -- we can trivially calculate the exact new values for (a).
    // (turns out, this does matter for preventing jitter).    
    if (!bweight) {
           if (dx < 0) a.ph.x = b.ph.x - a.ph.w;
      else if (dx > 0) a.ph.x = b.ph.x + b.ph.w;
      else if (dy < 0) a.ph.y = b.ph.y - a.ph.h;
      else if (dy > 0) a.ph.y = b.ph.y + b.ph.h;
      a.ph.adjusted = true;
      return;
    }
    
    if (aweight) {
      a.ph.x += dx * aweight;
      a.ph.y += dy * aweight;
      a.ph.adjusted = true;
    }
    if (bweight) {
      b.ph.x -= dx * bweight;
      b.ph.y -= dy * bweight;
      b.ph.adjusted = true;
    }
  }
}