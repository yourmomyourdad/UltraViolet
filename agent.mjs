const GATEWAY = "wss://webgate.blackj9898.workers.dev/agent";

function connect() {
  console.log("Connecting to WebGate...");

  const ws = new WebSocket(GATEWAY);

  ws.onopen = () => {
    console.log("CONNECTED TO WEBGATE");

    ws.send(JSON.stringify({
      type: "agent-hello"
    }));
  };

  ws.onmessage = (event) => {
    console.log("FROM WEBGATE:", event.data);

    // Echo test
    ws.send(event.data);
  };

  ws.onclose = () => {
    console.log("Disconnected. Retrying...");
    setTimeout(connect, 2000);
  };

  ws.onerror = (error) => {
    console.error("WebGate error:", error);
  };
}

connect();
