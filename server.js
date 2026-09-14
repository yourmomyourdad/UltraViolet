import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8080);

const uvDir = path.join(__dirname, "Ultraviolet", "dist");

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".map": "application/json",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  let filePath;

  if (url.pathname === "/") {
    filePath = path.join(__dirname, "index.html");
  } else if (url.pathname.startsWith("/uv/")) {
    const fileName = url.pathname.slice("/uv/".length);
    filePath = path.join(uvDir, fileName);
  } else {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("File not found");
    return;
  }

  const ext = path.extname(filePath);

  res.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
  });

  fs.createReadStream(filePath).pipe(res);
});

server.on("upgrade", (req, socket, head) => {
  wisp.routeRequest(req, socket, head);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
