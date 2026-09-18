const GATEWAY = "wss://webgate.blackj9898.workers.dev/";

function connect() {
    console.log("Connecting to WebGate...");

    const ws = new WebSocket(GATEWAY);

    ws.on("open", () => {
        console.log("CONNECTED TO WEBGATE");

        ws.send(JSON.stringify({
            type: "agent-hello"
        }));
    });

    ws.on("message", (data) => {
        console.log("FROM WEBGATE:", data.toString());

        // Temporary test: echo everything back.
        ws.send(data);
    });

    ws.on("close", () => {
        console.log("Disconnected. Reconnecting in 2 seconds...");
        setTimeout(connect, 2000);
    });

    ws.on("error", (err) => {
        console.error("WebGate error:", err.message);
    });
}

connect();
