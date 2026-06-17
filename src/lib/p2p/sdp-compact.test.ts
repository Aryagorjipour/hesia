import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { describe, it } from "node:test";
import { deriveSyncKey } from "../crypto/sync-password.ts";
import {
  compactSignalFingerprint,
  extractCompactSignal,
  rebuildSdp,
} from "./sdp-compact.ts";

Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});

async function deriveChannelSalt(sessionId: string): Promise<Uint8Array> {
  const hash = await webcrypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`hesia-p2p-channel-v1:${sessionId}`),
  );
  return new Uint8Array(hash).slice(0, 16);
}

const SAMPLE_SDP = `v=0\r
o=- 123 2 IN IP4 127.0.0.1\r
s=-\r
t=0 0\r
a=group:BUNDLE 0\r
m=application 9 UDP/DTLS/SCTP webrtc-datachannel\r
c=IN IP4 0.0.0.0\r
a=ice-ufrag:ABCD\r
a=ice-pwd:abcdefghijklmnopqrstuv\r
a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99\r
a=setup:actpass\r
a=mid:0\r
a=sctp-port:5000\r
a=candidate:1 1 udp 2122260223 192.168.1.10 54321 typ host\r
a=candidate:2 1 udp 2122260223 192.168.1.11 54322 typ host\r
a=candidate:3 1 udp 2122260223 10.0.0.5 54323 typ host\r
a=candidate:4 1 udp 2122260223 172.16.0.2 54324 typ host\r
a=candidate:5 1 udp 2122260223 192.168.56.1 54325 typ host\r
a=candidate:6 1 udp 1686052607 203.0.113.10 54326 typ srflx raddr 192.168.1.10 rport 54321\r
a=candidate:7 1 tcp 1518280447 192.168.1.10 9 typ host tcptype active\r
`;

describe("sdp-compact", () => {
  it("extracts and rebuilds a minimal signal", () => {
    const compact = extractCompactSignal(SAMPLE_SDP, "offer");
    assert.equal(compact.ufrag, "ABCD");
    assert.ok(compact.candidates.length <= 12);

    const rebuilt = rebuildSdp(compact, "offer");
    assert.match(rebuilt, /a=ice-ufrag:ABCD/);
    assert.match(rebuilt, /a=ice-pwd:abcdefghijklmnopqrstuv/);
    assert.match(rebuilt, /a=setup:actpass/);
  });

  it("creates stable fingerprint strings", () => {
    const compact = extractCompactSignal(SAMPLE_SDP, "offer");
    const first = compactSignalFingerprint(compact);
    const second = compactSignalFingerprint(compact);
    assert.equal(first, second);
    assert.ok(first.includes("ufrag=ABCD"));
  });

  it("keeps compact v2 offer payloads QR-friendly", () => {
    const compact = extractCompactSignal(SAMPLE_SDP, "offer");
    const packet = {
      v: 2,
      type: "offer",
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      deviceId: "a1b2c3d4e5f6",
      publicKeyJwk: { kty: "EC", crv: "P-256", x: "abc", y: "def" },
      deviceLabel: "Test Phone",
      signal: compact,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      signature: "dGVzdC1zaWduYXR1cmU=",
      preview: { tasks: 3, tags: 2, categories: 1 },
    };

    const encoded = Buffer.from(JSON.stringify(packet)).toString("base64url");
    assert.ok(encoded.length < 1500, `payload length ${encoded.length}`);
  });

  it("derives matching password channel keys per session", async () => {
    const sessionId = "550e8400-e29b-41d4-a716-446655440000";
    const password = "test-password-123";
    const salt = await deriveChannelSalt(sessionId);
    const sender = await deriveSyncKey(password, salt);
    const receiver = await deriveSyncKey(password, salt);
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode("hesia-p2p-channel-check");
    const cipher = await webcrypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      sender,
      plaintext,
    );
    const decrypted = await webcrypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      receiver,
      cipher,
    );
    assert.equal(new TextDecoder().decode(decrypted), "hesia-p2p-channel-check");
  });
});