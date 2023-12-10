/* DataService.js
 * Maintains a cache of data files on the server.
 */
 
export const RESTYPES = ["image", "map"];
 
export class DataService {
  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
    
    this.allFiles = null; // {path,serial,tid,rid,name}[] ; (tid) is string. (serial) is ArrayBuffer or Image
    this.allFilesPromise = null; // Promise if loading
  }
  
  getAllFiles() {
    if (this.allFilesPromise) return this.allFilesPromise;
    if (this.allFiles) return Promise.resolve(this.allFiles);
    return this.allFilesPromise = this.loadDirectoryRecursively("/data")
      .then(files => { this.allFiles = files; })
      .then(() => {
        this.allFilesPromise = null;
        return this.allFiles;
      }).catch(e => {
        this.allFilesPromise = null;
        throw e;
      });
  }
  
  reprFile(file) {
    if (file.tid && file.name) {
      return `${file.tid}:${file.rid}: ${file.name}`;
    } else if (file.tid && file.rid) {
      return `${file.tid}:${file.rid}`;
    } else {
      return file.path || "Invalid file.";
    }
  }
  
  getFileSync(path) {
    return this.allFiles.find(f => f.path === path);
  }
  
  updateFile(path, serial) {
    if (!this.allFiles) return Promise.reject(new Error(`Files not loaded`));
    if (!(serial instanceof ArrayBuffer)) return Promise.reject(new Error(`updateFile requires an ArrayBuffer (you provided ${serial?.constructor?.name || typeof(serial)})`));
    const file = this.allFiles.find(f => f.path === path);
    if (!file) return Promise.reject(new Error(`Path does not name a known file: ${path}`));
    const oldSerial = file.serial;
    file.serial = serial; // optimistically replace what's in our cache, just in case somebody asks for it before save completes.
    return this.window.fetch(path, {
      method: "PUT",
      mode: "same-origin",
      redirect: "error",
      body: serial,
    }).then(rsp => {
      if (!rsp.ok) throw rsp;
    }).catch(error => {
      // Restore what's in our cache.
      file.serial = oldSerial;
      throw error;
    });
  }
  
  loadDirectoryRecursively(path) {
  
    // Let the browser's Image object handle images.
    if (path.endsWith(".png")) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => {
          resolve(this.wrapFile(image, path, "image/png"));
        });
        image.addEventListener("error", e => reject(`${path}: Failed to load image`));
        image.src = path;
      });
    }
  
    return this.window.fetch(path, {
      method: "GET",
      mode: "same-origin",
      redirect: "error",
    }).then(rsp => {
      if (!rsp.ok) throw rsp;
      // Our server flags directories with "X-Is-Directory: true" so we know it before finishing the response body.
      if (rsp.headers.get("X-Is-Directory") === "true") {
        return rsp.json().then(bases => {
          return Promise.all(bases.map(base => this.loadDirectoryRecursively(path + "/" + base)))
            .then(responses => this.flattenArray(responses));
        });
      }
      // Everything else is a file. Fetch raw content as ArrayBuffer and generate a resource record.
      return rsp.arrayBuffer().then(serial => this.wrapFile(serial, path, rsp.headers.get("Content-Type")));
    });
  }
  
  // Flattens out one level of child arrays.
  flattenArray(src) {
    if (!(src instanceof Array)) return src;
    const dst = [];
    for (const child of src) {
      if (child instanceof Array) {
        for (const grandkid of child) dst.push(grandkid);
      } else {
        dst.push(child);
      }
    }
    return dst;
  }
  
  wrapFile(serial, path, contentType) {
    const { tid, rid, name } = this.parsePath(path);
    const file = { path, serial, tid, rid, name };
    return file;
  }
  
  parsePath(path) {
    let base = "";
    let tid = "";
    for (const unit of path.split("/")) {
      if (RESTYPES.indexOf(unit) >= 0) tid = unit;
      base = unit;
    }
    let [flag, rid, dummy1, name, dummy2, sfx] = base.match(/^(\d*)(-([0-9a-zA-Z_-]*))?(\.(.*))?$/) || [];
    rid = +rid || 0;
    if (!name) name = "";
    return { tid, rid, name };
  }
}

DataService.singleton = true;
