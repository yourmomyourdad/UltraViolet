import http from "node:http";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const uvPath = path.join(
  __dirname,
  "Ultraviolet",
  "dist"
);

// Your files first.
app.use(express.static(__dirname));

// UV vendor files.
app.use("/uv/", express.static(uvPath));

// Epoxy vendor files.
app.use("/epoxy/", express.static(epoxyPath));

// BareMux vendor files.
app.use("/baremux/", express.static(baremuxPath));

// 404.
app.use((req, res) => {
  res.status(404).send("Not found");
});

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

server.on("upgrade", (req, socket, head) => {
  if (req.url?.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
    return;
  }

  socket.end();
});

const PORT = Number(process.env.PORT || 8080);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Ultraviolet + Wisp listening on ${PORT}`);
});
