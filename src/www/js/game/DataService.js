/* DataService.js
 * Manages the data files inlined in our index.html.
 * Also responsible for high score persistence.
 * (but not input config persistence; that's InputManager).
 */
 
import { Grid } from "./Grid.js";
 
// (string) => ArrayBuffer, kind of crazy that browsers still don't supply a straightforward way to do this...
export function decodeBase64(src) {
  const dsta = Math.ceil(src.length * 0.75); // Maximum output length 3/4 input.
  const dst = new Uint8Array(dsta);
  let dstc = 0, srcp = 0;
  const tmp = new Uint8Array(4); // collect input code points
  let tmpc = 0;
  for (; srcp<src.length; srcp++) {
    const srcb = src.charCodeAt(srcp);
    let v;
         if ((srcb >= 0x41) && (srcb <= 0x5a)) v = srcb - 0x41;
    else if ((srcb >= 0x61) && (srcb <= 0x7a)) v = srcb - 0x61 + 26;
    else if ((srcb >= 0x30) && (srcb <= 0x39)) v = srcb - 0x30 + 52;
    else if (srcb === 0x2b) v = 62; // plus
    else if (srcb === 0x2f) v = 63; // slash
    else continue;
    tmp[tmpc++] = v;
    if (tmpc >= 4) {
      dst[dstc++] = (tmp[0] << 2) | (tmp[1] >> 4);
      dst[dstc++] = (tmp[1] << 4) | (tmp[2] >> 2);
      dst[dstc++] = (tmp[2] << 6) | tmp[3];
      tmpc = 0;
    }
  }
  switch (tmpc) {
    case 1: dst[dstc++] = tmp[0] << 2; break;
    case 2: dst[dstc++] = (tmp[0] << 2) | (tmp[1] >> 4); break;
    case 3: dst[dstc++] = (tmp[0] << 2) | (tmp[1] >> 4); dst[dstc++] = (tmp[1] << 4) | (tmp[2] >> 2); break;
  }
  if (dstc < dsta) return dst.slice(0, dstc);
  return dst;
}
 
export class DataService {
  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
    
    this.files = []; // {tid,rid,serial,name,path,object} ; object gets instantiated lazily
    this.loaded = false;
    this.loadPromise = null;
    this.bestTime = 0; // sec; don't touch directly
  }
  
  getBestTime() {
    if (this.bestTime) return this.bestTime;
    try {
      this.bestTime = JSON.parse(this.window.localStorage.getItem("bestTime"));
      if ((typeof(this.bestTime) !== "number") || isNaN(this.bestTime) || (this.bestTime < 0)) {
        this.bestTime = 0;
      }
    } catch (e) {
      this.bestTime = 0;
    }
    if (this.bestTime) return this.bestTime;
    return 999999; // overflow our printing and it will display as "99:99.999"
  }
  
  setBestTimeIfBetter(incoming) {
    const previous = this.getBestTime();
    if (incoming < previous) {
      this.bestTime = incoming;
      this.window.localStorage.setItem("bestTime", JSON.stringify(this.bestTime));
    }
  }
  
  getResourceSync(tid, rid) {
    const file = this.files.find(f => f.tid === tid && f.rid === rid);
    if (!file) return null;
    if (!file.object) {
      file.object = this.instantiateResource(file.tid, file.serial, file);
    }
    return file.object;
  }
  
  instantiateResource(tid, serial, file) {
    switch (tid) {
      case "map": return new Grid(serial);
    }
    // Default, use the incoming ArrayBuffer verbatim.
    return serial;
  }
  
  load() {
    if (this.loaded) return Promise.resolve();
    for (const element of this.window.document.querySelectorAll("th-res")) {
      const tid = element.getAttribute("data-tid");
      if (!tid) continue;
      const rid = +element.getAttribute("data-rid");
      if (!rid) continue;
      let serial = element.innerText;
      switch (tid) {
        case "song": serial = decodeBase64(serial); break;
      }
      this.files.push({
        tid, rid,
        serial,
      });
    }
    for (const element of this.window.document.querySelectorAll("img[data-rid]")) {
      this.files.push({
        tid: "image",
        rid: +element.getAttribute("data-rid"),
        object: element,
      });
    }
    this.loaded = true;
    return Promise.resolve();
  }
}

DataService.singleton = true;
