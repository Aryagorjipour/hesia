import { db } from "@/lib/db/schema";
import type { DeviceIdentityRecord } from "@/types/p2p-sync";
import { deriveSyncKey } from "@/lib/crypto/sync-password";

const ECDSA_PARAMS: EcKeyGenParams = {
  name: "ECDSA",
  namedCurve: "P-256",
};

const SIGN_PARAMS: EcdsaParams = {
  name: "ECDSA",
  hash: "SHA-256",
};

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

function toBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

export async function computeDeviceId(publicKeyJwk: JsonWebKey): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(publicKeyJwk));
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .slice(0, 6)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function encryptPrivateKey(
  privateKeyJwk: JsonWebKey,
  password: string,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveSyncKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(privateKeyJwk));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBuffer(iv) },
    key,
    plaintext,
  );
  const payload = {
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(cipher)),
  };
  return JSON.stringify(payload);
}

async function decryptPrivateKey(
  encrypted: string,
  password: string,
): Promise<JsonWebKey> {
  const payload = JSON.parse(encrypted) as {
    salt: string;
    iv: string;
    ciphertext: string;
  };
  const key = await deriveSyncKey(password, fromBase64(payload.salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBuffer(fromBase64(payload.iv)) },
    key,
    toBuffer(fromBase64(payload.ciphertext)),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as JsonWebKey;
}

export async function ensureDeviceIdentity(
  password: string,
): Promise<DeviceIdentityRecord> {
  const existing = await db.deviceIdentity.get("local");
  if (existing) return existing;

  const keyPair = await crypto.subtle.generateKey(ECDSA_PARAMS, true, [
    "sign",
    "verify",
  ]);
  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const deviceId = await computeDeviceId(publicKeyJwk);
  const record: DeviceIdentityRecord = {
    id: "local",
    deviceId,
    publicKeyJwk,
    encryptedPrivateKey: await encryptPrivateKey(privateKeyJwk, password),
    createdAt: new Date().toISOString(),
  };
  await db.deviceIdentity.put(record);
  return record;
}

export async function getDeviceIdentity(): Promise<DeviceIdentityRecord | undefined> {
  return db.deviceIdentity.get("local");
}

async function importPrivateKey(
  record: DeviceIdentityRecord,
  password: string,
): Promise<CryptoKey> {
  const privateKeyJwk = await decryptPrivateKey(
    record.encryptedPrivateKey,
    password,
  );
  return crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    ECDSA_PARAMS,
    false,
    ["sign"],
  );
}

export async function importPublicKey(
  publicKeyJwk: JsonWebKey,
): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", publicKeyJwk, ECDSA_PARAMS, true, [
    "verify",
  ]);
}

export function buildSignaturePayload(parts: Record<string, string>): string {
  return Object.keys(parts)
    .sort()
    .map((key) => `${key}=${parts[key]}`)
    .join("&");
}

export async function signPayload(
  record: DeviceIdentityRecord,
  password: string,
  parts: Record<string, string>,
): Promise<string> {
  const privateKey = await importPrivateKey(record, password);
  const data = new TextEncoder().encode(buildSignaturePayload(parts));
  const signature = await crypto.subtle.sign(SIGN_PARAMS, privateKey, data);
  return toBase64(new Uint8Array(signature));
}

export async function verifyPayload(
  publicKeyJwk: JsonWebKey,
  parts: Record<string, string>,
  signature: string,
): Promise<boolean> {
  try {
    const publicKey = await importPublicKey(publicKeyJwk);
    const data = new TextEncoder().encode(buildSignaturePayload(parts));
    return crypto.subtle.verify(
      SIGN_PARAMS,
      publicKey,
      toBuffer(fromBase64(signature)),
      data,
    );
  } catch {
    return false;
  }
}