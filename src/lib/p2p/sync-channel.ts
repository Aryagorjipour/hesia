import { deriveSyncKey } from "@/lib/crypto/sync-password";
import {
  decryptWithKey,
  encryptWithKey,
} from "@/lib/crypto/trusted-session";
import {
  SyncChannelMessageSchema,
  type SyncChannelMessage,
} from "@/types/p2p-sync";
import type { WebRtcPeer } from "@/lib/p2p/webrtc-peer";

export type CryptoMode = "trusted" | "password";

export interface SyncChannelCrypto {
  mode: CryptoMode;
  key: CryptoKey;
}

export async function createPasswordChannelCrypto(
  password: string,
): Promise<SyncChannelCrypto> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveSyncKey(password, salt);
  return { mode: "password", key };
}

export function createTrustedChannelCrypto(key: CryptoKey): SyncChannelCrypto {
  return { mode: "trusted", key };
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

export async function encryptMessage(
  cryptoCtx: SyncChannelCrypto,
  message: SyncChannelMessage,
): Promise<string> {
  const { iv, ciphertext } = await encryptWithKey(
    cryptoCtx.key,
    JSON.stringify(message),
  );
  return JSON.stringify({ iv, ciphertext, mode: cryptoCtx.mode });
}

export async function decryptMessage(
  cryptoCtx: SyncChannelCrypto,
  payload: string,
): Promise<SyncChannelMessage> {
  const parsed = JSON.parse(payload) as {
    iv: string;
    ciphertext: string;
    mode?: CryptoMode;
  };
  const plaintext = await decryptWithKey(
    cryptoCtx.key,
    parsed.iv,
    parsed.ciphertext,
  );
  const message = JSON.parse(plaintext) as SyncChannelMessage;
  const result = SyncChannelMessageSchema.safeParse(message);
  if (!result.success) throw new Error("Invalid sync channel message");
  return result.data;
}

export class SyncChannel {
  private peer: WebRtcPeer;
  private crypto: SyncChannelCrypto | null = null;
  private listeners = new Set<(message: SyncChannelMessage) => void>();

  constructor(peer: WebRtcPeer) {
    this.peer = peer;
  }

  setCrypto(crypto: SyncChannelCrypto) {
    this.crypto = crypto;
  }

  onMessage(listener: (message: SyncChannelMessage) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  bind() {
    return this.peer;
  }

  async send(message: SyncChannelMessage) {
    if (!this.crypto) throw new Error("Sync channel crypto not configured");
    const encrypted = await encryptMessage(this.crypto, message);
    this.peer.send(encrypted);
  }

  handleRawMessage(payload: string) {
    if (!this.crypto) return;
    void decryptMessage(this.crypto, payload)
      .then((message) => {
        for (const listener of this.listeners) listener(message);
      })
      .catch(() => {
        // ignore malformed frames
      });
  }
}

export async function encryptChunk(
  cryptoCtx: SyncChannelCrypto,
  chunk: string,
  index: number,
  total: number,
): Promise<{ iv: string; ciphertext: string }> {
  return encryptWithKey(
    cryptoCtx.key,
    JSON.stringify({ index, total, chunk }),
  );
}

export async function decryptChunk(
  cryptoCtx: SyncChannelCrypto,
  iv: string,
  ciphertext: string,
): Promise<{ index: number; total: number; chunk: string }> {
  const plaintext = await decryptWithKey(cryptoCtx.key, iv, ciphertext);
  return JSON.parse(plaintext) as { index: number; total: number; chunk: string };
}

export async function checksumString(value: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return toBase64(new Uint8Array(hash));
}

export { toBase64, fromBase64 };