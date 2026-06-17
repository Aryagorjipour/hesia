#!/usr/bin/env node
/**
 * Hesia LAN sync relay — WebSocket signaling only (no file data).
 * Zero npm deps. Run: npm run sync:relay
 */
import { createServer } from "node:http";
import os from "node:os";
import process from "node:process";
import { acceptWebSocket } from "./ws-lite.mjs";

function parseArgs(argv) {
  let port = Number(process.env.HESIA_RELAY_PORT) || 8765;
  let pin = process.env.HESIA_RELAY_PIN || null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--port" && argv[i + 1]) port = Number(argv[++i]);
    else if (argv[i] === "--pin" && argv[i + 1]) pin = String(argv[++i]);
  }
  return { port, pin };
}

function getLanAddresses() {
  const addrs = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) addrs.push(entry.address);
    }
  }
  return addrs;
}

function peerList(excludeDeviceId) {
  const peers = [];
  for (const meta of clients.values()) {
    if (meta.deviceId !== excludeDeviceId) {
      peers.push({ deviceId: meta.deviceId, label: meta.label });
    }
  }
  return peers;
}

function send(ws, message) {
  if (ws.readyState === 1) ws.send(JSON.stringify(message));
}

const { port, pin } = parseArgs(process.argv);
/** @type {Map<import('./ws-lite.mjs').WebSocketConnection, { deviceId: string, label: string }>} */
const clients = new Map();

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hesia sync relay — connect via WebSocket\n");
});

httpServer.on("upgrade", (req, socket) => {
  const ws = acceptWebSocket(req, socket);
  if (!ws) return;

  ws.onmessage = (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    if (msg.type === "join") {
      const deviceId = String(msg.deviceId ?? "").trim();
      const label = String(msg.label ?? "Hesia device").trim().slice(0, 32);
      const joinPin = msg.pin != null ? String(msg.pin) : null;

      if (!deviceId || deviceId.length < 8) {
        send(ws, { type: "error", message: "deviceId required" });
        return;
      }
      if (pin && joinPin !== pin) {
        send(ws, { type: "error", message: "Wrong room PIN" });
        ws.close();
        return;
      }
      for (const [other, meta] of clients) {
        if (meta.deviceId === deviceId && other !== ws) {
          send(ws, { type: "error", message: "deviceId already connected" });
          ws.close();
          return;
        }
      }

      clients.set(ws, { deviceId, label });
      send(ws, { type: "joined", deviceId, peers: peerList(deviceId) });
      for (const [other] of clients) {
        if (other !== ws) {
          send(other, { type: "peer-joined", peer: { deviceId, label } });
        }
      }
      return;
    }

    const meta = clients.get(ws);
    if (!meta) {
      send(ws, { type: "error", message: "Send join first" });
      return;
    }

    if (msg.type === "signal") {
      const to = String(msg.to ?? "");
      const from = String(msg.from ?? "");
      if (from !== meta.deviceId) {
        send(ws, { type: "error", message: "from must match your deviceId" });
        return;
      }
      let delivered = false;
      for (const [other, otherMeta] of clients) {
        if (otherMeta.deviceId === to) {
          send(other, {
            type: "signal",
            from: meta.deviceId,
            to,
            kind: msg.kind,
            payload: msg.payload ?? {},
          });
          delivered = true;
          break;
        }
      }
      if (!delivered) send(ws, { type: "error", message: "Peer not found", to });
      return;
    }

    send(ws, { type: "error", message: "Unknown message type" });
  };

  ws.onclose = () => {
    const meta = clients.get(ws);
    if (!meta) return;
    clients.delete(ws);
    for (const other of clients.keys()) {
      send(other, { type: "peer-left", deviceId: meta.deviceId });
    }
  };
});

httpServer.listen(port, "0.0.0.0", () => {
  const ips = getLanAddresses();
  console.log("\nHesia sync relay running\n");
  console.log(`  Local:   ws://127.0.0.1:${port}`);
  for (const ip of ips) console.log(`  Network: ws://${ip}:${port}`);
  if (pin) console.log(`  PIN:     ${pin}`);
  console.log("\nPress Ctrl+C to stop.\n");
});