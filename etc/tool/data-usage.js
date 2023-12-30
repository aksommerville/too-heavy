/* data-usage.js
 * Reads our final HTML file and reports data usage, so I can target optimization efforts.
 */
 
const fs = require("fs");

if (process.argv.length !== 3) {
  throw new Error(`Usage: ${process.argv[1]} HTMLFILE`);
}

const srcpath = process.argv[2];
const src = fs.readFileSync(srcpath).toString("utf8");

/* Interesting features:
 *   <img> Should be just one.
 *   <th-res data-tid="map">
 *   <th-res data-tid="song">
 *   <script> Should be just one.
 * Everything else is CSS and HTML boilerplate, should be trivial.
 * Maps and songs (and any other resource), we always put data-tid first, can depend on that.
 */
let imgCount = 0;
let imgSize = 0;
let mapCount = 0;
let mapSize = 0;
let songCount = 0;
let songSize = 0;
let scriptCount = 0;
let scriptSize = 0;
let otherSize = 0;
for (let srcp=0; srcp<src.length; ) {
  
  // Everything interesting begins with '<'.
  const tagp = src.indexOf("<", srcp);
  if (tagp < 0) {
    otherSize += src.length - srcp;
    break;
  }
  
  if (src.substring(tagp, tagp + 4) === "<img") {
    const endp = src.indexOf(">", srcp);
    if (endp < 0) throw new Error(`Unclosed <img> tag!`);
    otherSize += tagp - srcp;
    imgCount++;
    imgSize += endp + 1 - tagp;
    srcp = endp + 1;
    continue;
  }
  
  if (src.substring(tagp, tagp + 22) === "<th-res data-tid=\"map\"") {
    let endp = src.indexOf("</th-res>", srcp);
    if (endp < 0) throw new Error(`Unclosed <th-res> tag!`);
    endp += 9;
    otherSize += tagp - srcp;
    mapCount++;
    mapSize += endp - tagp;
    srcp = endp;
    continue;
  }
  
  if (src.substring(tagp, tagp + 23) === "<th-res data-tid=\"song\"") {
    let endp = src.indexOf("</th-res>", srcp);
    if (endp < 0) throw new Error(`Unclosed <th-res> tag!`);
    endp += 9;
    otherSize += tagp - srcp;
    songCount++;
    songSize += endp - tagp;
    srcp = endp;
    continue;
  }
  
  if (src.substring(tagp, tagp + 7) === "<script") {
    let endp = src.indexOf("</script>", srcp);
    if (endp < 0) throw new Error(`Unclosed <script> tag!`);
    endp += 9;
    otherSize += tagp - srcp;
    scriptCount++;
    scriptSize += endp - tagp;
    srcp = endp;
    continue;
  }
  
  otherSize += tagp - srcp + 1;
  srcp = tagp + 1;
}

console.log(`${srcpath}: ${src.length} bytes total`);
console.log(`${imgSize.toString().padStart(6)} image (${imgCount})`);
console.log(`${mapSize.toString().padStart(6)} map (${mapCount})`);
console.log(`${songSize.toString().padStart(6)} song (${songCount})`);
console.log(`${scriptSize.toString().padStart(6)} script (${scriptCount})`);
console.log(`${otherSize.toString().padStart(6)} other`);
