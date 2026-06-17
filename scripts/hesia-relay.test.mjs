import assert from "node:assert/strict";
import { createServer } from "node:http";
import { describe, it, before, after } from "node:test";
import { acceptWebSocket } from "./ws-lite.mjs";

function createTestRelay() {
  const clients = new Map();

  function peerList(excludeId) {
    const peers = [];
    for (const meta of clients.values()) {
      if (meta.deviceId !== excludeId) {
        peers.push({ deviceId: meta.deviceId, label: meta.label });
      }
    }
    return peers;
  }

  const httpServer = createServer((_req, res) => {
    res.writeHead(200);
    res.end("ok");
  });

  httpServer.on("upgrade", (req, socket) => {
    const ws = acceptWebSocket(req, socket);
    if (!ws) return;

    ws.onmessage = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === "join") {
        clients.set(ws, { deviceId: msg.deviceId, label: msg.label });
        ws.send(
          JSON.stringify({
            type: "joined",
            deviceId: msg.deviceId,
            peers: peerList(msg.deviceId),
          }),
        );
        return;
      }
      const meta = clients.get(ws);
      if (!meta || msg.type !== "signal") return;
      for (const [other, otherMeta] of clients) {
        if (otherMeta.deviceId === msg.to) {
          other.send(
            JSON.stringify({
              type: "signal",
              from: meta.deviceId,
              to: msg.to,
              kind: msg.kind,
              payload: msg.payload,
            }),
          );
          break;
        }
      }
    };

    ws.onclose = () => clients.delete(ws);
  });

  return new Promise((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => {
      const port = httpServer.address().port;
      resolve({
        url: `ws://127.0.0.1:${port}`,
        close: () =>
          new Promise((done) => {
            httpServer.close(done);
          }),
      });
    });
  });
}

function connectClient(url, deviceId, label) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", deviceId, label }));
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.type === "joined") resolve({ ws, msg });
    };
    ws.onerror = () => reject(new Error("ws error"));
  });
}

describe("hesia relay protocol", () => {
  let relay;

  before(async () => {
    relay = await createTestRelay();
  });

  after(async () => {
    await relay.close();
  });

  it("lists peers after join", async () => {
    const a = await connectClient(relay.url, "deviceaaaa1111", "Phone");
    const b = await connectClient(relay.url, "devicebbbb2222", "Desktop");
    assert.equal(a.msg.peers.length, 0);
    assert.equal(b.msg.peers.length, 1);
    assert.equal(b.msg.peers[0].label, "Phone");
    a.ws.close();
    b.ws.close();
  });

  it("forwards signals between peers", async () => {
    const a = await connectClient(relay.url, "devicecccc3333", "A");
    const b = await connectClient(relay.url, "devicedddd4444", "B");

    const received = new Promise((resolve) => {
      b.ws.onmessage = (event) => {
        const msg = JSON.parse(String(event.data));
        if (msg.type === "signal") resolve(msg);
      };
    });

    a.ws.send(
      JSON.stringify({
        type: "signal",
        from: "devicecccc3333",
        to: "devicedddd4444",
        kind: "sync-request",
        payload: { sessionId: "test-session" },
      }),
    );

    const msg = await received;
    assert.equal(msg.from, "devicecccc3333");
    assert.equal(msg.kind, "sync-request");
    a.ws.close();
    b.ws.close();
  });
});