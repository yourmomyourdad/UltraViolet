import { createServer } from 'node:http';
import { wispServer } from 'wisp-server-node';

const server = createServer();

server.on('upgrade', (req, socket, head) => {
    // Process Wisp WebSocket handshakes coming from your frontend
    if (req.url.startsWith('/wisp/')) {
        wispServer.routeRequest(req, socket, head);
    } else {
        socket.destroy();
    }
});

server.on('request', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Wisp server endpoint active.');
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`📡 Pure Wisp Server running on port ${PORT}`);
});
