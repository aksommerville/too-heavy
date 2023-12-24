/* I goofed and put the bass and lead tracks in the wrong order for one song.
 * It's a dumb way to pick instruments, but whatever I'm in a hurry.
 * Swap the order of the last two MTrk in a MIDI file, in place.
 */

const fs = require("fs");

if (process.argv.length !== 3) {
  throw new Error(`Usage: node ${process.argv[1]} MIDIFILE`);
}
const path = process.argv[2];

const src = fs.readFileSync(path);

const chunkv = []; // { headerp, srcp, chunkid, chunklen } chunklen does not include the header
for (let srcp=0; srcp<=src.length-8; ) {
  const headerp = srcp;
  const chunkid = src.toString("utf8", srcp, srcp + 4);
  const chunklen = (src[srcp+4] << 24) | (src[srcp+5] << 16) | (src[srcp+6] << 8) | src[srcp+7];
  srcp += 8;
  //console.log(`${path}:${headerp}/${src.length}: ${chunkid} ${chunklen}`);
  if ((chunklen < 0) || (srcp > src.length - chunklen)) {
    throw new Error(`${path}: Invalid MIDI chunk geometry`);
  }
  chunkv.push({ headerp, srcp, chunkid, chunklen });
  srcp += chunklen;
}

let chunka = null, chunkb = null;
for (const chunk of chunkv) {
  chunk.dstheaderp = chunk.headerp;
  //console.log(JSON.stringify(chunk));
  if (chunk.chunkid === "MTrk") {
    chunka = chunkb;
    chunkb = chunk;
  }
}
if (!chunka) {
  throw new Error(`${path}: Expected at least two MTrk chunks`);
}
if (chunka.headerp + 8 + chunka.chunklen !== chunkb.headerp) {
  //console.log(`chunka: ${JSON.stringify(chunka)}`);
  //console.log(`chunkb; ${JSON.stringify(chunkb)}`);
  throw new Error(`${path}: Last two MTrks have something else between them. (what the hell is it? how did this happen?)`);
}

/* Having identified the last two MTrks, rewrite their dstheaderp, then rewrite the file.
 */
chunkb.dstheaderp = chunka.headerp;
chunka.dstheaderp = chunkb.dstheaderp + 8 + chunkb.chunklen;
const dst = Buffer.alloc(src.length);
for (const chunk of chunkv) {
  //console.log(JSON.stringify(chunk));
  src.copy(dst, chunk.dstheaderp, chunk.headerp, chunk.headerp + 8 + chunk.chunklen);
}
fs.writeFileSync(path, dst);
console.log(`${path}: Rewrote file with last two MTrk swapped`);
