import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8080);

const UV_DIR = path.join(__dirname, "Ultraviolet", "dist");

// Epoxy 2.x exposes epoxyPath.
const { epoxyPath } = require("@mercuryworkshop/epoxy-transport");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
};

function safePath(root, requested) {
  const base = path.resolve(root);
  const full = path.resolve(root, requested);

  if (full !== base && !full.startsWith(base + path.sep)) {
    return null;
  }

  return full;
}

function serve(res, file, headers = {}) {
  if (!fs.existsSync(file)) {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "Content-Type":
      MIME[path.extname(file)] || "application/octet-stream",
    ...headers,
  });

  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    // Frontend
    if (pathname === "/" || pathname === "/index.html") {
      return serve(res, path.join(__dirname, "index.html"));
    }

    // Ultraviolet
    if (pathname.startsWith("/uv/")) {
      const requested = pathname.slice("/uv/".length);
      const file = safePath(UV_DIR, requested);

      if (!file) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      if (requested === "sw.js") {
        return serve(res, file, {
          "Service-Worker-Allowed": "/",
        });
      }

      return serve(res, file);
    }

    // BareMux
    if (pathname.startsWith("/baremux/")) {
      const requested = pathname.slice("/baremux/".length);
      const file = safePath(baremuxPath, requested);

      if (!file) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      return serve(res, file);
    }

    // Epoxy
    if (pathname.startsWith("/epoxy/")) {
      const requested = pathname.slice("/epoxy/".length);
      const file = safePath(epoxyPath, requested);

      if (!file) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      return serve(res, file);
    }

    res.writeHead(404);
    res.end("Not found");
  } catch (error) {
    console.error("HTTP error:", error);
    res.writeHead(500);
    res.end("Internal server error");
  }
});

// Wisp endpoint
server.on("upgrade", (req, socket, head) => {
  if (!req.url.endsWith("/wisp/")) {
    socket.destroy();
    return;
  }

  try {
    wisp.routeRequest(req, socket, head);
  } catch (error) {
    console.error("Wisp error:", error);
    socket.destroy();
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Ultraviolet + Wisp listening on ${PORT}`);
});
