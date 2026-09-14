import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8080);
const UV_DIR = path.join(__dirname, "Ultraviolet", "dist");

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".map": "application/json"
};

const server = http.createServer((req, res) => {
  let requestPath = decodeURIComponent(
    new URL(req.url, `http://${req.headers.host}`).pathname
  );

  // UV files
  if (requestPath.startsWith("/uv/")) {
    const file = path.join(
      UV_DIR,
      requestPath.substring("/uv/".length)
    );

    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      const ext = path.extname(file);

      res.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "application/octet-stream"
      });

      fs.createReadStream(file).pipe(res);
      return;
    }

    res.writeHead(404);
    res.end("UV file not found");
    return;
  }

  // Frontend
  if (requestPath === "/" || requestPath === "/index.html") {
    const file = path.join(__dirname, "index.html");

    res.writeHead(200, {
      "Content-Type": "text/html"
    });

    fs.createReadStream(file).pipe(res);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

// Wisp WebSocket server
server.on("upgrade", (req, socket, head) => {
  wisp.routeRequest(req, socket, head);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`UV + Wisp listening on port ${PORT}`);
  console.log(`Port: ${PORT}`);
});
