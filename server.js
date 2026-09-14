import express from 'express';
import { createServer } from 'node:http';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';

const app = express();
const server = createServer();

// Serve the compiled Ultraviolet engine assets
app.use('/uv/', express.static('dist'));

// Serve your custom config definition fallback override
app.use('/uv/uv.config.js', express.static('public/uv.config.js'));

// Serve your HTML frontend
app.use(express.static('public'));

app.use((req, res) => {
    res.status(404).send('Resource unreachable');
});

// Intercept standard HTTP upgrades and route them into the Wisp handler
server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/wisp/')) {
        wisp.routeRequest(req, socket, head);
    } else {
        socket.end();
    }
});

server.on('request', (req, res) => {
    app(req, res);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Wisp Server & Proxy UI online at http://localhost:${PORT}`);
});
