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

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".map": "application/json"
};


// --------------------------------------------------
// UV handler
// --------------------------------------------------

async function handleUV(request, response) {
  try {
    const uvHandler = await import(
      path.join(UV_DIR, "uv.handler.js")
    );

    await uvHandler.default(
      request,
      response
    );

  } catch (error) {

    console.error("UV handler error:", error);

    if (!response.headersSent) {
      response.writeHead(500);
      response.end("Ultraviolet handler error");
    }
  }
}


// --------------------------------------------------
// HTTP server
// --------------------------------------------------

const server = http.createServer(async (request, response) => {

  const url = new URL(
    request.url,
    `http://${request.headers.host}`
  );

  // ----------------------------------------------
  // UV service requests
  // ----------------------------------------------

  if (url.pathname.startsWith("/service/")) {
    await handleUV(request, response);
    return;
  }


  // ----------------------------------------------
  // UV static files
  // ----------------------------------------------

  if (url.pathname.startsWith("/uv/")) {

    const relative = url.pathname
      .slice("/uv/".length);

    const file = path.join(
      UV_DIR,
      relative
    );

    if (
      fs.existsSync(file) &&
      fs.statSync(file).isFile()
    ) {

      const ext = path.extname(file);

      response.writeHead(200, {
        "Content-Type":
          MIME[ext] ||
          "application/octet-stream"
      });

      fs.createReadStream(file).pipe(response);

      return;
    }

    response.writeHead(404);
    response.end("UV file not found");

    return;
  }


  // ----------------------------------------------
  // Frontend
  // ----------------------------------------------

  if (
    url.pathname === "/" ||
    url.pathname === "/index.html"
  ) {

    const file = path.join(
      __dirname,
      "index.html"
    );

    response.writeHead(200, {
      "Content-Type": "text/html"
    });

    fs.createReadStream(file).pipe(response);

    return;
  }


  response.writeHead(404);
  response.end("Not found");
});


// --------------------------------------------------
// Wisp
// --------------------------------------------------

server.on("upgrade", (request, socket, head) => {

  console.log(
    "WebSocket upgrade:",
    request.url
  );

  wisp.routeRequest(
    request,
    socket,
    head
  );

});


// --------------------------------------------------
// Start
// --------------------------------------------------

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log("");
    console.log("================================");
    console.log(" Ultraviolet + Wisp");
    console.log("================================");
    console.log(` Port: ${PORT}`);
    console.log("");
  }
);
