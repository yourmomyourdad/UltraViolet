import http from "node:http";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const PORT = Number(process.env.PORT || 8080);

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("Wisp server is running!");
});

httpServer.on("upgrade", (req, socket, head) => {
  wisp.routeRequest(req, socket, head);
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Wisp server listening on port ${PORT}`);
  console.log(`HTTP: http://0.0.0.0:${PORT}/`);
});
