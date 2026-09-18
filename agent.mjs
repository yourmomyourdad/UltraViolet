const GATEWAY =
  "wss://YOUR-WEBGATE.workers.dev/agent";

const WISP =
  "ws://127.0.0.1:8080/wisp/";

let gateway;
let wisp;

function connect() {
  console.log("Connecting to WebGate...");

  gateway = new WebSocket(GATEWAY);
  wisp = new WebSocket(WISP);

  gateway.binaryType = "arraybuffer";
  wisp.binaryType = "arraybuffer";

  gateway.onopen = () => {
    console.log("WebGate connected");
    tryBridge();
  };

  wisp.onopen = () => {
    console.log("Local Wisp connected");
    tryBridge();
  };

  gateway.onmessage = (event) => {
    if (wisp.readyState === WebSocket.OPEN) {
      wisp.send(event.data);
    }
  };

  wisp.onmessage = (event) => {
    if (gateway.readyState === WebSocket.OPEN) {
      gateway.send(event.data);
    }
  };

  gateway.onclose = () => {
    console.log("WebGate disconnected");
    reconnect();
  };

  wisp.onclose = () => {
    console.log("Local Wisp disconnected");
    reconnect();
  };

  gateway.onerror = (err) => {
    console.error("WebGate error:", err);
  };

  wisp.onerror = (err) => {
    console.error("Wisp error:", err);
  };
}

function tryBridge() {
  if (
    gateway.readyState === WebSocket.OPEN &&
    wisp.readyState === WebSocket.OPEN
  ) {
    console.log("🔥 WebGate ↔ Wisp bridge ACTIVE");
  }
}

let reconnecting = false;

function reconnect() {
  if (reconnecting) return;

  reconnecting = true;

  setTimeout(() => {
    reconnecting = false;
    connect();
  }, 2000);
}

connect();
