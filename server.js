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

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm"
};

function safePath(base, requested) {
  const root = path.resolve(base);
  const file = path.resolve(base, requested);

  if (file !== root && !file.startsWith(root + path.sep)) {
    return null;
  }

  return file;
}

function sendFile(res, file, headers = {}) {
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "Content-Type":
      MIME[path.extname(file)] ||
      "application/octet-stream",
    ...headers
  });

  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(
    req.url,
    `http://${req.headers.host}`
  );

  const pathname = decodeURIComponent(url.pathname);

  // Frontend
  if (pathname === "/" || pathname === "/index.html") {
    return sendFile(
      res,
      path.join(__dirname, "index.html")
    );
  }

  // UV files
  if (pathname.startsWith("/uv/")) {
    const requested = pathname.slice("/uv/".length);
    const file = safePath(UV_DIR, requested);

    if (!file) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    // This is the important bit:
    // /uv/sw.js can control /service/
    if (requested === "sw.js") {
      return sendFile(res, file, {
        "Service-Worker-Allowed": "/"
      });
    }

    return sendFile(res, file);
  }

  // BareMux
  if (pathname.startsWith("/baremux/")) {
    const requested = pathname.slice("/baremux/".length);

    const root = path.join(
      NODE_MODULES,
      "@mercuryworkshop",
      "bare-mux"
    );

    const file = safePath(root, requested);

    if (!file) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    return sendFile(res, file);
  }

  // Epoxy, if installed
  if (pathname.startsWith("/epoxy/")) {
    const requested = pathname.slice("/epoxy/".length);

    const root = path.join(
      NODE_MODULES,
      "@mercuryworkshop",
      "epoxy-transport"
    );

    const file = safePath(root, requested);

    if (!file) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    return sendFile(res, file);
  }

  res.writeHead(404);
  res.end("Not found");
});

server.on("upgrade", (req, socket, head) => {
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
