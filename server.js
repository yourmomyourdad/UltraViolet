import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8080);

const UV_DIR = path.join(__dirname, "Ultraviolet", "dist");
const NODE_MODULES = path.join(__dirname, "node_modules");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function serveFile(res, file) {
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(file);

  res.writeHead(200, {
    "Content-Type": mime[ext] || "application/octet-stream",
  });

  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  // Your frontend
  if (pathname === "/" || pathname === "/index.html") {
    return serveFile(res, path.join(__dirname, "index.html"));
  }

  // Ultraviolet build files
  if (pathname.startsWith("/uv/")) {
    const file = pathname.slice("/uv/".length);

    // Prevent paths such as /uv/../../something
    if (file.includes("..")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    return serveFile(res, path.join(UV_DIR, file));
  }

  // BareMux
  if (pathname.startsWith("/baremux/")) {
    const file = pathname.slice("/baremux/".length);

    if (file.includes("..")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    return serveFile(
      res,
      path.join(
        NODE_MODULES,
        "@mercuryworkshop",
        "bare-mux",
        "lib",
        file
      )
    );
  }

  // Epoxy transport
  if (pathname.startsWith("/epoxy/")) {
    const file = pathname.slice("/epoxy/".length);

    if (file.includes("..")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    return serveFile(
      res,
      path.join(
        NODE_MODULES,
        "@mercuryworkshop",
        "epoxy-transport",
        "lib",
        file
      )
    );
  }

  res.writeHead(404);
  res.end("Not found");
});

// Wisp WebSocket endpoint
server.on("upgrade", (req, socket, head) => {
  wisp.routeRequest(req, socket, head);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("======================================");
  console.log("       Ultraviolet + Wisp");
  console.log("======================================");
  console.log("");
  console.log(`Server running on port ${PORT}`);
  console.log("");
});
