import { toArrayBuffer } from "@/lib/crypto/buffer";
import { deriveSyncKey } from "@/lib/crypto/sync-password";

async function deriveChannelSalt(sessionId: string): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`hesia-sync-channel-v1:${sessionId}`),
  );
  return new Uint8Array(hash).slice(0, 16);
}

export async function createChannelKey(
  password: string,
  sessionId: string,
): Promise<CryptoKey> {
  const salt = await deriveChannelSalt(sessionId);
  return deriveSyncKey(password, salt);
}

export async function encryptWithKey(
  key: CryptoKey,
  plaintext: string,
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encoded),
  );
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipher))),
  };
}

export async function decryptWithKey(
  key: CryptoKey,
  iv: string,
  ciphertext: string,
): Promise<string> {
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(ivBytes) },
    key,
    toArrayBuffer(data),
  );
  return new TextDecoder().decode(decrypted);
}

export async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}