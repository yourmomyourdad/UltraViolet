import http from "node:http";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8080);

const app = express();

const uvPath = path.join(
  __dirname,
  "Ultraviolet",
  "dist"
);

// Frontend files
app.use(express.static(__dirname));

// UV files
app.use(
  "/uv",
  express.static(uvPath, {
    setHeaders(res, filePath) {
      if (path.basename(filePath) === "sw.js") {
        res.setHeader(
          "Service-Worker-Allowed",
          "/"
        );
      }
    }
  })
);

// BareMux files
app.use(
  "/baremux",
  express.static(baremuxPath)
);

// Epoxy files
app.use(
  "/epoxy",
  express.static(epoxyPath)
);

const server = http.createServer((req, res) => {
  res.setHeader(
    "Cross-Origin-Opener-Policy",
    "same-origin"
  );

  res.setHeader(
    "Cross-Origin-Embedder-Policy",
    "require-corp"
  );

  app(req, res);
});

// Wisp
server.on("upgrade", (req, socket, head) => {
  if (req.url?.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Ultraviolet + Wisp listening on ${PORT}`
    );
  }
);
