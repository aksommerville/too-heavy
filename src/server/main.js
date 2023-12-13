const http = require("http");
const fs = require("fs");
const child_process = require("child_process");

const htdocsv = [];
const makeablev = [];
let putpfx = null;
for (let argi=2; argi<process.argv.length; argi++) {
  const arg = process.argv[argi];
  if (arg.startsWith("--makeable=")) makeablev.push(arg.substring(11));
  else if (arg.startsWith("--put=")) putpfx = arg.substring(6);
  else if (arg === "--help") {
    console.log(`Usage: node ${process.argv[1]} HTDOCS [HTDOCS...] [--makeable=PATH...] [--put=PATH]`);
    process.exit(0);
  } else if (arg.startsWith('-')) throw new Error(`${process.argv[1]}: Unexpected argument ${JSON.stringify(arg)}`);
  else htdocsv.push(arg);
}

function guessContentType(path, serial) {
  const sfx = (path.match(/.*\.([^.\/]*)$/) || ['', ''])[1].toLowerCase();
  switch (sfx) {
    case "js": return "application/javascript";
    case "css": return "text/css";
    case "png": return "image/png";
    case "ico": return "image/x-icon";
    case "html": return "text/html";
    default: return "application/octet-stream";
  }
}

function generateJsonDirectoryListing(path) {
  return JSON.stringify(fs.readdirSync(path));
}

function fail(rsp, code, msg) {
  rsp.statusCode = code;
  rsp.statusMessage = msg;
  rsp.end();
}

function serveGet(req, rsp) {
  if (req.url.indexOf('?') >= 0) return fail(rsp, 400, "GETs must not have a query string");
  let path = null, st;
  for (const prefix of htdocsv) {
    try {
      path = prefix + req.url;
      st = fs.statSync(path);
      break;
    } catch (e) {
      path = null;
      // ok try next prefix
    }
  }
  if (!path) return fail(rsp, 404, "File not found");
  if (path.indexOf("..") >= 0) return fail(rsp, 404, "File not found");
  try {
    const st = fs.statSync(path);
    if (st.isDirectory()) {
      rsp.setHeader("Content-Type", "application/json");
      rsp.setHeader("X-Is-Directory", "true"); // important signal to our editor
      rsp.statusCode = 200;
      rsp.end(generateJsonDirectoryListing(path));
    } else {
      if (makeablev.indexOf(path) >= 0) {
        const makeOutput = child_process.execSync(`make ${path}`);
        console.log(makeOutput.toString("utf8").trim());
        //TODO If make fails, we should return an error for the browser to display.
        // Not urgent. This is a Javascript app, make doesn't really do much.
      }
      const serial = fs.readFileSync(path);
      // Browsers are picky about Content-Type, for some things like Javascript. Highly stupid :P
      rsp.setHeader("Content-Type", guessContentType(path, serial));
      rsp.statusCode = 200;
      rsp.end(serial);
    }
  } catch (e) {
    console.log(e);
    fail(rsp, 404, "File not found");
  }
}

function servePut(req, rsp) {
  if (!putpfx) return fail(rsp, 405, "Method not allowed");
  if (req.url.indexOf('?') >= 0) return fail(rsp, 400, "PUTs must not have a query string");
  const path = putpfx + req.url;
  if (path.indexOf("..") >= 0) return fail(rsp, 404, "File not found");
  try {
    fs.writeFileSync(path, req.body);
    rsp.statusCode = 200;
    rsp.end();
  } catch (e) {
    fail(rsp, 500, "Error writing file");
  }
}

function servePost(req, rsp) {
  fail(rsp, 405, "No such operation");
}

const server = http.createServer();
server.listen(8080, () => {
  console.log(`Serving on port 8080`);
  server.on("request", (req, rsp) => {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      req.body = body;
      switch (req.method) {
        case "GET": return serveGet(req, rsp);
        case "PUT": return servePut(req, rsp);
        case "POST": return servePost(req, rsp);
        default: {
            rsp.statusCode = 405;
            rsp.end();
          }
      }
    });
  });
});
