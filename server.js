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
  ".ico": "image/x-icon",
};

function sendFile(res, filePath, headers = {}) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
    });

    res.end("File not found");
    return;
  }

  const extension = path.extname(filePath);

  res.writeHead(200, {
    "Content-Type":
      MIME_TYPES[extension] ||
      "application/octet-stream",

    ...headers,
  });

  fs.createReadStream(filePath).pipe(res);
}

function safePath(base, requested) {
  const full = path.resolve(base, requested);
  const root = path.resolve(base);

  if (
    full !== root &&
    !full.startsWith(root + path.sep)
  ) {
    return null;
  }

  return full;
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host}`
    );

    const pathname = decodeURIComponent(url.pathname);

    // -----------------------------
    // Frontend
    // -----------------------------

    if (
      pathname === "/" ||
      pathname === "/index.html"
    ) {
      return sendFile(
        res,
        path.join(__dirname, "index.html")
      );
    }

    // -----------------------------
    // UV service worker
    //
    // IMPORTANT:
    // The worker is served from /service/
    // so it can naturally control /service/.
    // -----------------------------

    if (pathname === "/service/sw.js") {
      return sendFile(
        res,
        path.join(UV_DIR, "sw.js")
      );
    }

    // -----------------------------
    // Ultraviolet files
    // -----------------------------

    if (pathname.startsWith("/uv/")) {
      const requested = pathname.slice(4);
      const filePath = safePath(
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

    // -----------------------------
    // BareMux files
    // -----------------------------

    if (pathname.startsWith("/baremux/")) {
      const requested = pathname.slice(8);

      const baremuxRoot = path.join(
        NODE_MODULES,
        "@mercuryworkshop",
        "bare-mux"
      );

      const filePath = safePath(
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

    // -----------------------------
    // Epoxy transport files
    // -----------------------------

    if (pathname.startsWith("/epoxy/")) {
      const requested = pathname.slice(7);

      const epoxyRoot = path.join(
        NODE_MODULES,
        "@mercuryworkshop",
        "epoxy-transport"
      );

      const filePath = safePath(
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

    // -----------------------------
    // Everything else
    // -----------------------------

    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
    });

    res.end("Not found");

  } catch (error) {
    console.error("HTTP error:", error);

    res.writeHead(500, {
      "Content-Type": "text/plain; charset=utf-8",
    });

    res.end("Internal server error");
  }
});

// -----------------------------
// Wisp WebSocket
// -----------------------------

server.on("upgrade", (req, socket, head) => {
  try {
    wisp.routeRequest(req, socket, head);
  } catch (error) {
    console.error("Wisp error:", error);

    socket.destroy();
  }
});

// -----------------------------
// Start
// -----------------------------

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      "     Ultraviolet + Wisp Server"
    );
    console.log(
      "======================================"
    );
    console.log("");
    console.log(
      `Listening on port ${PORT}`
    );
    console.log("");
  }
);
