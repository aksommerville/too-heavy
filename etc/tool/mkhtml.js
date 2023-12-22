/* mkhtml.js
 * Pack all code and assets into one HTML file. Is that feasible?
 */
 
const fs = require("fs");
const minifyJavascript = require("./minifyJavascript.js");
const reencodeSong = require("./reencodeSong.js");

const RESTYPES = ["image", "map", "song"];

const exename = process.argv[1] || "mkhtml.js";
let dstpath = null;
let htmlpath = null;
const images = []; // sparse, keyed by id
const maps = []; // ''
const songs = []; // ''
let scripts = []; // contiguous

// => [tid,rid]
function classifyInputFile(path) {
  let base = "", tid = "";
  for (const unit of path.split("/")) {
    if (RESTYPES.indexOf(unit) >= 0) tid = unit;
    base = unit;
  }
  if (!tid) { // In the absence of "/data/TID/yadda...", use the path's suffix.
    const bsplit = base.split('.');
    if (bsplit.length >= 2) {
      tid = bsplit[bsplit.length - 1];
    }
  }
  const ridMatch = base.match(/^(\d+)/);
  const rid = ridMatch ? +ridMatch[1] : 0;
  return [tid, rid];
}

function digestScript(path, serial) {
  const { src, imports } = minifyJavascript(serial, path);
  return { path, src, imports };
}

for (let argi=2; argi<process.argv.length; argi++) {
  const arg = process.argv[argi];
  if (arg.startsWith("-o")) {
    if (dstpath) throw new Error(`${exename}: Multiple output paths`);
    dstpath = arg.substring(2);
  } else if (arg.startsWith("-")) {
    throw new Error(`${exename}: Unexpected argument ${JSON.stringify(arg)}`);
  } else {
    const [tid, rid] = classifyInputFile(arg);
    const serial = fs.readFileSync(arg);
    switch (tid) {
      case "image": images[rid] = serial; break;
      case "map": maps[rid] = serial; break;
      case "song": songs[rid] = reencodeSong(serial, arg); break;
      case "js": scripts.push(digestScript(arg, serial)); break;
      case "html": {
          if (htmlpath) throw new Error(`${exename}: Multiple HTML inputs (${htmlpath}, ${arg}). Should have exactly one.`);
          htmlpath = arg;
        } break;
      default: throw new Error(`${exename}: ${arg}: Unexpected file type ${JSON.stringify(tid)}`);
    }
  }
}
if (!dstpath) throw new Error(`${exename}: Please specify output path as '-oPATH'`);
if (!htmlpath) throw new Error(`${exename}: Input must include exactly one HTML file.`);

/* Build up the scripts in their include order.
 * Put each script's imports before it, if they haven't been visited yet.
 * There are circular imports in our source, and there has to be.
 * Those aren't a problem, because in our circular cases nothing inherits from the other or uses the other's symbols immediately.
 * We do have code doing that stuff tho (where import order matters), and none of it is circular.
 */
const orderedScripts = [];
function addScript(path) {
  const p = scripts.findIndex(s => s.path === path);
  if (p < 0) return;
  const script = scripts[p];
  scripts.splice(p, 1);
  for (const before of script.imports) {
    addScript(before);
  }
  orderedScripts.push(script);
}
while (scripts.length) {
  addScript(scripts[0].path);
}
scripts = orderedScripts;

/* Produce a block of HTML encoding these resources, for sparse arrays indexed by rid.
 * (tid) is the type name for encoding, and always influences formatting.
 */
function emitResources(resv, tid) {
  let dst = "";
  let encode;
  switch (tid) {
    // Images are special, they encode a bit different from anything else:
    case "image": encode = (rid, serial) => `<img data-rid="${rid}" style="display:none" src="data:image/png;base64,${serial.toString("base64")}"/>\n`; break;
    // Maps encode generically, but as plain text, no point base64ing them:
    case "map": encode = (rid, serial) => `<th-res data-tid="${tid}" data-rid="${rid}" style="display:none">\n${serial.toString("utf8")}\n</th-res>\n`; break;
    // Everything else (eg song), encode generically and base64 the payload:
    default: encode = (rid, serial) => `<th-res data-tid="${tid}" data-rid="${rid}" style="display:none">\n${serial.toString("base64")}\n</th-res>\n`; break;
  }
  for (let rid=1; rid<resv.length; rid++) {
    const serial = resv[rid];
    if (!serial) continue;
    dst += encode(rid, serial);
  }
  return dst;
}

/* Run through index.html linewise. Delete and insert things in places we magically know about.
 */
const htmlTemplate = fs.readFileSync(htmlpath);
let dsthtml = "";
for (let srcp=0, lineno=1; srcp<htmlTemplate.length; lineno++) {
  let nlp = htmlTemplate.indexOf(0x0a, srcp);
  if (nlp < 0) nlp = htmlTemplate.length;
  const line = htmlTemplate.toString("utf8", srcp, nlp).trim();
  srcp = nlp + 1;
  if (!line) continue;
  
  if (line.startsWith("<script")) {
    dsthtml += emitResources(images, "image");
    dsthtml += emitResources(maps, "map");
    dsthtml += emitResources(songs, "song");
    dsthtml += line + "\n";
    dsthtml += "const TILESIZE = 16;\n"; // poor planning on my part. fix this eventually, TODO
    for (const { src } of scripts) {
      dsthtml += src + "\n";
    }
    continue;
  }
  
  if (line.startsWith("import ")) continue;
  
  dsthtml += line + "\n";
}

fs.writeFileSync(dstpath, dsthtml);
