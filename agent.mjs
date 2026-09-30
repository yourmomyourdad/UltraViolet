import wrtc from "@roamhq/wrtc";
import WebSocket from "ws";

const SIGNAL_URL =
  "https://webgatesignal.blackj9898.workers.dev";

const {
  RTCPeerConnection,
  RTCSessionDescription
} = wrtc;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getOffer() {
  const response = await fetch(
    `${SIGNAL_URL}/signal/offer`
  );

  const text = await response.text();

  return text ? JSON.parse(text) : null;
}

async function putAnswer(sessionId, data) {
  const response = await fetch(
    `${SIGNAL_URL}/signal/${sessionId}/answer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }
  );

  if (!response.ok) {
    throw new Error(
      `Signal POST failed: ${response.status}`
    );
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

  channel.binaryType = "arraybuffer";

  wisp.on("open", () => {
    console.log("🔥 Wisp connected");
    console.log("🔥 WebRTC ↔ Wisp bridge ACTIVE");
  });

  // WebRTC → Wisp
  channel.onmessage = event => {
    if (wisp.readyState === WebSocket.OPEN) {
      wisp.send(event.data);
    }
  };

  // Wisp → WebRTC
  wisp.on("message", data => {
    if (channel.readyState === "open") {
      channel.send(data);
    }
  });

  wisp.on("error", error => {
    console.error("Wisp error:", error);
  });

  wisp.on("close", () => {
    console.log("Wisp closed");

    if (channel.readyState === "open") {
      channel.close();
    }
  });
}

async function main() {
  console.log("Waiting for browser offer...");

  let offer = null;

  while (!offer) {
    offer = await getOffer();

    if (!offer) {
      await wait(1000);
    }
  }

  console.log("✅ Offer received");
  const sessionId = offer.sessionId;

if (!sessionId) {
  throw new Error("Offer has no sessionId");
}

console.log("Session:", sessionId);
  console.log(
  offer.sdp.match(/^a=candidate:.*$/gm)?.join("\n")
  || "NO ICE CANDIDATES"
);
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
};
channel.onmessage = event => {
  if (event.data === "START_WISP") {
    console.log("🚀 Starting Wisp bridge...");
    bridgeToWisp(channel);
  }
};
    channel.onclose = () => {
      console.log("DataChannel closed");
    };
  };

  await pc.setRemoteDescription(
  new RTCSessionDescription({
    type: offer.type,
    sdp: offer.sdp
  })
);

  const answer = await pc.createAnswer();

  await pc.setLocalDescription(answer);

  console.log("Gathering ICE...");

  pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log("AGENT CANDIDATE:", event.candidate.candidate);
  } else {
    console.log("AGENT ICE GATHERING COMPLETE");
  }
};

console.log("Gathering ICE...");

await new Promise(resolve => setTimeout(resolve, 5000));

console.log("=== AGENT SDP ===");
console.log(pc.localDescription?.sdp);
  
  console.log("=== AGENT ICE CANDIDATES ===");

console.log(
  pc.localDescription.sdp
    .match(/^a=candidate:.*$/gm)
    ?.join("\n") || "NO AGENT CANDIDATES"
);

  console.log("Sending answer...");

  await putAnswer(sessionId, {
  sessionId,
  type: pc.localDescription.type,
  sdp: pc.localDescription.sdp
});

  console.log("✅ Answer sent");
  console.log("Waiting for WebRTC connection...");
}

main().catch(error => {
  console.error("FATAL:", error);
});
