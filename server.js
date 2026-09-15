import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8080);

const UV_DIR = path.join(
  __dirname,
  "Ultraviolet",
  "dist"
);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function safeJoin(root, requested) {
  const base = path.resolve(root);
  const target = path.resolve(root, requested);

  if (
    target !== base &&
    !target.startsWith(base + path.sep)
  ) {
    return null;
  }

  return target;
}

function serveFile(res, filePath, extraHeaders = {}) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("Not found");
    return;
  }

  const extension = path.extname(filePath);

  res.writeHead(200, {
    "Content-Type":
      MIME_TYPES[extension] ||
      "application/octet-stream",
    ...extraHeaders
  });

  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host}`
    );

    const pathname = decodeURIComponent(url.pathname);

    // Frontend
    if (
      pathname === "/" ||
      pathname === "/index.html"
    ) {
      return serveFile(
        res,
        path.join(__dirname, "index.html")
      );
    }

    // Ultraviolet
    if (pathname.startsWith("/uv/")) {
      const requested =
        pathname.slice("/uv/".length);

      const file = safeJoin(
        UV_DIR,
        requested
      );

      if (!file) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      if (requested === "sw.js") {
        return serveFile(
          res,
          file,
          {
            "Service-Worker-Allowed": "/"
          }
        );
      }

      return serveFile(res, file);
    }

    // BareMux
    if (pathname.startsWith("/baremux/")) {
      const requested =
        pathname.slice("/baremux/".length);

      const file = safeJoin(
        baremuxPath,
        requested
      );

      if (!file) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      return serveFile(res, file);
    }

    // Epoxy
    if (pathname.startsWith("/epoxy/")) {
      const requested =
        pathname.slice("/epoxy/".length);

      const file = safeJoin(
        epoxyPath,
        requested
      );

      if (!file) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      return serveFile(res, file);
    }

    // Anything else
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("Not found");

  } catch (error) {
    console.error("HTTP error:", error);

    res.writeHead(500, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("Internal server error");
  }
});

// Wisp WebSocket
server.on("upgrade", (req, socket, head) => {
  try {
    if (!req.url || !req.url.endsWith("/wisp/")) {
      socket.destroy();
      return;
    }

    wisp.routeRequest(
      req,
      socket,
      head
    );

  } catch (error) {
    console.error(
      "Wisp error:",
      error
    );

    socket.destroy();
  }
});

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log("");
    console.log("======================================");
    console.log("       Ultraviolet + Wisp");
    console.log("======================================");
    console.log("");
    console.log(`Listening on port ${PORT}`);
    console.log("");
  }
);
