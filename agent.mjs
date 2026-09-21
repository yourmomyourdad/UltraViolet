import wrtc from "@roamhq/wrtc";

const SIGNAL_URL =
  "https://script.google.com/macros/s/AKfycbwffo0OMhpc9XxYtMRrJ2lAz0fIZrmmVqQVw5mNWcs414rCC1fXWsD4cOSV3SvYuJ1m/exec";

const {
  RTCPeerConnection,
  RTCSessionDescription
} = wrtc;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getSignal(type) {
  const response = await fetch(
    `${SIGNAL_URL}?action=get&type=${type}`
  );

  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

async function putSignal(type, data) {
  const response = await fetch(SIGNAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type,
      data
    })
  });

  if (!response.ok) {
    throw new Error(`Signal POST failed: ${response.status}`);
  }
}

async function waitForIceComplete(pc) {
  if (pc.iceGatheringState === "complete") {
    return;
  }

  await new Promise(resolve => {
    const check = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener(
          "icegatheringstatechange",
          check
        );
        resolve();
      }
    };

    pc.addEventListener(
      "icegatheringstatechange",
      check
    );
  });
}

function bridgeToWisp(channel) {
  const wisp = new WebSocket(
    "ws://127.0.0.1:8080/wisp/"
  );

  wisp.binaryType = "arraybuffer";
  channel.binaryType = "arraybuffer";

  wisp.onopen = () => {
    console.log("🔥 Wisp connected");
    console.log("🔥 WebRTC ↔ Wisp bridge ACTIVE");
  };

  // WebRTC → Wisp
  channel.onmessage = event => {
    if (wisp.readyState === WebSocket.OPEN) {
      wisp.send(event.data);
    }
  };

  // Wisp → WebRTC
  wisp.onmessage = event => {
    if (channel.readyState === "open") {
      channel.send(event.data);
    }
  };

  wisp.onerror = error => {
    console.error("Wisp error:", error);
  };

  wisp.onclose = () => {
    console.log("Wisp closed");

    if (channel.readyState === "open") {
      channel.close();
    }
  };
}

async function main() {
  console.log("Waiting for browser offer...");

  let offer = null;

  while (!offer) {
    offer = await getSignal("offer");

    if (!offer) {
      await wait(1000);
    }
  }

  console.log("✅ Offer received");

  const pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302"
      }
    ]
  });

  pc.oniceconnectionstatechange = () => {
    console.log("ICE:", pc.iceConnectionState);
  };

  pc.onconnectionstatechange = () => {
    console.log("Connection:", pc.connectionState);
  };

  pc.ondatachannel = event => {
    const channel = event.channel;

    console.log(
      "🎉 DataChannel received:",
      channel.label
    );

    channel.binaryType = "arraybuffer";

    channel.onopen = () => {
      console.log("🎉 WebRTC connected");
      bridgeToWisp(channel);
    };

    channel.onclose = () => {
      console.log("DataChannel closed");
    };
  };

  await pc.setRemoteDescription(
    new RTCSessionDescription(offer)
  );

  const answer = await pc.createAnswer();

  await pc.setLocalDescription(answer);

  console.log("Gathering ICE...");

  await waitForIceComplete(pc);

  console.log("Sending answer...");

  await putSignal(
    "answer",
    pc.localDescription
  );

  console.log("✅ Answer sent");
  console.log("Waiting for WebRTC connection...");
}

main().catch(error => {
  console.error("FATAL:", error);
});
