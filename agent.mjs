import wrtc from "@roamhq/wrtc";

const SIGNAL_URL =
"https://script.google.com/macros/s/AKfycbwffo0OMhpc9XxYtMRrJ2lAz0fIZrmmVqQVw5mNWcs414rCC1fXWsD4cOSV3SvYuJ1m/exec";
const {
  RTCPeerConnection,
  RTCSessionDescription
} = wrtc;

async function getSignal(type) {
  const response = await fetch(
    `${SIGNAL_URL}?action=get&type=${type}`
  );

  const text = await response.text();

  return text ? JSON.parse(text) : null;
}

async function putSignal(type, data) {
  await fetch(SIGNAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type,
      data
    })
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

  console.log("Offer received.");

  const pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302"
      }
    ]
  });

  pc.ondatachannel = event => {
    const channel = event.channel;

    console.log("🎉 DATA CHANNEL RECEIVED");

    channel.binaryType = "arraybuffer";

    channel.onopen = () => {
      console.log("🔥 DATA CHANNEL OPEN");

      channel.send("HELLO FROM CODESPACE");
    };

    channel.onmessage = event => {
      console.log("FROM CHROMEBOOK:", event.data);

      channel.send(
        "ECHO: " + event.data
      );
    };

    channel.onclose = () => {
      console.log("DataChannel closed.");
    };
  };

  pc.oniceconnectionstatechange = () => {
    console.log(
      "ICE:",
      pc.iceConnectionState
    );
  };

  await pc.setRemoteDescription(
    new RTCSessionDescription(offer)
  );

  const answer = await pc.createAnswer();

  await pc.setLocalDescription(answer);

  await new Promise(resolve => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }

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

  console.log("Sending answer...");

  await putSignal(
    "answer",
    pc.localDescription
  );

  console.log("Answer sent. Waiting for connection...");
}

main().catch(console.error);
function bridgeToWisp(channel) {
  const wisp = new WebSocket("ws://127.0.0.1:8080/wisp/");

  wisp.binaryType = "arraybuffer";
  channel.binaryType = "arraybuffer";

  wisp.onopen = () => {
    console.log("🔥 Wisp connected");
  };

  // WebRTC → Wisp
  channel.onmessage = (event) => {
    if (wisp.readyState === WebSocket.OPEN) {
      wisp.send(event.data);
    }
  };

  // Wisp → WebRTC
  wisp.onmessage = (event) => {
    if (channel.readyState === "open") {
      channel.send(event.data);
    }
  };

  wisp.onerror = (e) => {
    console.error("Wisp error:", e);
  };

  wisp.onclose = () => {
    console.log("Wisp closed");
    channel.close();
  };
}
pc.ondatachannel = (event) => {
  const channel = event.channel;

  channel.onopen = () => {
    console.log("🎉 WebRTC connected");
    bridgeToWisp(channel);
  };
};
