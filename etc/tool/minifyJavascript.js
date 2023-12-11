/* minifyJavascript.js
 * Takes a script and the path to it, produces an object detailing imports and the source text with comments removed.
 */
 
function stripLastPathComponent(path) {
  for (let i=path.length; i-->0; ) {
    if (path[i] === '/') return path.substring(0, i);
  }
  return "";
}
 
// We don't care which symbols are imported, just the path.
function extractImportPath(line, refpath, lineno) {
  if (line.indexOf(" as ") >= 0) {
    throw new Error(`${refpath}:${lineno}: Can't handle 'import ... as ...' statements`);
  }
  const openp = line.indexOf('"');
  if (openp < 0) throw new Error(`${refpath}:${lineno}: No quote in import line. Is it using apostrophes? Please change to quote.`);
  const closep = line.indexOf('"', openp + 1);
  if (closep < 0) throw new Error(`${refpath}:${lineno}: Malformed import line`);
  
  let dir = stripLastPathComponent(refpath);
  let relpath = line.substring(openp + 1, closep);
  while (relpath.startsWith("../")) {
    relpath = relpath.substring(3);
    dir = stripLastPathComponent(dir);
  }
  if (relpath.startsWith("./")) {
    relpath = relpath.substring(2);
  }
  return dir + "/" + relpath;
}
 
module.exports = function minifyJavascript(src, path) {
  const context = { src: "", path, imports: [] };
  let blockComment = false;
  for (let srcp=0, lineno=1; srcp<src.length; lineno++) {
    let nlp = src.indexOf(0x0a, srcp);
    if (nlp < 0) nlp = src.length;
    let line = src.toString("utf8", srcp, nlp).trim();
    srcp = nlp + 1;
    
    /* We are not a real Javascript preprocessor!
     * Pretty narrow focus here:
     *  - Eliminate comments and obvious whitespace.
     *  - Eliminate and record imports.
     * We probably make some mistakes, and depend on code to be written in my own style.
     */
    if (blockComment) {
      const endp = line.indexOf("*/");
      if (endp < 0) {
        line = "";
      } else {
        line = line.substring(endp + 2).trim();
        blockComment = false;
      }
    }
    while (1) {
      const blockCommentp = line.indexOf("/*");
      if (blockCommentp < 0) break;
      const endCommentp = line.indexOf("*/", blockCommentp + 2);
      if (endCommentp >= 0) {
        line = line.substring(0, blockCommentp) + line.substring(endCommentp + 2);
      } else {
        line = line.substring(0, blockCommentp).trim();
        blockComment = true;
        break;
      }
    }
    const lineCommentp = line.indexOf("//");
    if (lineCommentp >= 0) line = line.substring(0, lineCommentp).trim();
    if (!line) continue;
    
    if (line.startsWith("import ")) {
      context.imports.push(extractImportPath(line, path, lineno));
      continue;
    }
    
    // I didn't put this symbol in a good shareable place and ended it defining it all over. oops. Outer layer inserts it in the main script block.
    if (line === "const TILESIZE = 16;") continue;
    
    context.src += line;
  }
  return context;
};
