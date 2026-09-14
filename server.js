import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8080);

const UV_DIR = path.join(
  __dirname,
  "Ultraviolet",
  "dist"
);

const NODE_MODULES = path.join(
  __dirname,
  "node_modules"
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm"
};

function safeJoin(base, requested) {
  const basePath = path.resolve(base);
  const fullPath = path.resolve(base, requested);

  if (
    fullPath !== basePath &&
    !fullPath.startsWith(basePath + path.sep)
  ) {
    return null;
  }

  return fullPath;
}

function sendFile(res, filePath, extraHeaders = {}) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("Not found");
    return;
  }

  const type =
    MIME[path.extname(filePath)] ||
    "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": type,
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

    // --------------------------------
    // Frontend
    // --------------------------------

    if (
      pathname === "/" ||
      pathname === "/index.html"
    ) {
      return sendFile(
        res,
        path.join(__dirname, "index.html")
      );
    }

    // --------------------------------
    // UV service-worker bootstrap
    // --------------------------------

    if (pathname === "/service/sw.js") {
      return sendFile(
        res,
        path.join(UV_DIR, "sw.js")
      );
    }

    // --------------------------------
    // Files imported by /service/sw.js
    //
    // sw.js uses relative imports:
    //   uv.bundle.js
    //   uv.config.js
    // --------------------------------

    if (pathname === "/service/uv.bundle.js") {
      return sendFile(
        res,
        path.join(UV_DIR, "uv.bundle.js")
      );
    }

    if (pathname === "/service/uv.config.js") {
      return sendFile(
        res,
        path.join(UV_DIR, "uv.config.js")
      );
    }

    if (pathname === "/service/uv.sw.js") {
      return sendFile(
        res,
        path.join(UV_DIR, "uv.sw.js")
      );
    }

    // --------------------------------
    // Normal UV files
    // --------------------------------

    if (pathname.startsWith("/uv/")) {
      const requested = pathname.slice("/uv/".length);

      const filePath = safeJoin(
        UV_DIR,
        requested
      );

      if (!filePath) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      return sendFile(res, filePath);
    }

    // --------------------------------
    // BareMux
    // --------------------------------

    if (pathname.startsWith("/baremux/")) {
      const requested = pathname.slice(
        "/baremux/".length
      );

      const baremuxRoot = path.join(
        NODE_MODULES,
        "@mercuryworkshop",
        "bare-mux"
      );

      const filePath = safeJoin(
        baremuxRoot,
        requested
      );

      if (!filePath) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      return sendFile(res, filePath);
    }

    // --------------------------------
    // Epoxy
    // --------------------------------

    if (pathname.startsWith("/epoxy/")) {
      const requested = pathname.slice(
        "/epoxy/".length
      );

      const epoxyRoot = path.join(
        NODE_MODULES,
        "@mercuryworkshop",
        "epoxy-transport"
      );

      const filePath = safeJoin(
        epoxyRoot,
        requested
      );

      if (!filePath) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      return sendFile(res, filePath);
    }

    // --------------------------------
    // Not found
    // --------------------------------

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

// --------------------------------
// Wisp WebSocket
// --------------------------------

server.on("upgrade", (req, socket, head) => {
  try {
    wisp.routeRequest(req, socket, head);
  } catch (error) {
    console.error("Wisp upgrade error:", error);
    socket.destroy();
  }
});

// --------------------------------
// Start
// --------------------------------

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
