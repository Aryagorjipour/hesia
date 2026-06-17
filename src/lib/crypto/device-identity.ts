import { db } from "@/lib/db/schema";
import type { DeviceIdentityRecord } from "@/types/p2p-sync";
import { deriveSyncKey } from "@/lib/crypto/sync-password";
import {
  formatCryptoError,
  isCryptoOperationError,
  toArrayBuffer,
} from "@/lib/crypto/buffer";

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

export async function computeDeviceId(publicKeyJwk: JsonWebKey): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(publicKeyJwk));
  const hash = await crypto.subtle.digest("SHA-256", toArrayBuffer(encoded));
  return Array.from(new Uint8Array(hash))
    .slice(0, 6)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface EncryptedPrivateKeyPayload {
  format: "pkcs8-v1" | "jwk-v0";
  salt: string;
  iv: string;
  ciphertext: string;
}

async function encryptPrivateKeyBytes(
  privateKeyBytes: Uint8Array,
  password: string,
  format: EncryptedPrivateKeyPayload["format"],
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveSyncKey(password, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(privateKeyBytes),
  );
  const payload: EncryptedPrivateKeyPayload = {
    format,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(cipher)),
  };
  return JSON.stringify(payload);
}

async function decryptPrivateKeyBytes(
  encrypted: string,
  password: string,
): Promise<{ bytes: Uint8Array; format: EncryptedPrivateKeyPayload["format"] }> {
  const payload = JSON.parse(encrypted) as EncryptedPrivateKeyPayload;
  const key = await deriveSyncKey(password, fromBase64(payload.salt));
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(fromBase64(payload.iv)) },
      key,
      toArrayBuffer(fromBase64(payload.ciphertext)),
    );
    return {
      bytes: new Uint8Array(decrypted),
      format: payload.format ?? "jwk-v0",
    };
  } catch (err) {
    if (isCryptoOperationError(err)) {
      throw new Error("Wrong sync password");
    }
    throw err;
  }
}

export async function resetDeviceIdentity(): Promise<void> {
  await db.deviceIdentity.delete("local");
}

export async function ensureDeviceIdentity(
  password: string,
): Promise<DeviceIdentityRecord> {
  const existing = await db.deviceIdentity.get("local");
  if (existing) return existing;

  try {
    const keyPair = await crypto.subtle.generateKey(ECDSA_PARAMS, true, [
      "sign",
      "verify",
    ]);
    const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyPkcs8 = new Uint8Array(
      await crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    );
    const deviceId = await computeDeviceId(publicKeyJwk);
    const record: DeviceIdentityRecord = {
      id: "local",
      deviceId,
      publicKeyJwk,
      encryptedPrivateKey: await encryptPrivateKeyBytes(
        privateKeyPkcs8,
        password,
        "pkcs8-v1",
      ),
      createdAt: new Date().toISOString(),
    };
    await db.deviceIdentity.put(record);
    return record;
  } catch (err) {
    throw new Error(
      formatCryptoError(err, "Could not create device identity"),
    );
  }
}

export async function getDeviceIdentity(): Promise<DeviceIdentityRecord | undefined> {
  return db.deviceIdentity.get("local");
}

async function importPrivateKey(
  record: DeviceIdentityRecord,
  password: string,
): Promise<CryptoKey> {
  const { bytes, format } = await decryptPrivateKeyBytes(
    record.encryptedPrivateKey,
    password,
  );

  try {
    if (format === "pkcs8-v1") {
      return crypto.subtle.importKey(
        "pkcs8",
        toArrayBuffer(bytes),
        ECDSA_PARAMS,
        false,
        ["sign"],
      );
    }

    const privateKeyJwk = JSON.parse(
      new TextDecoder().decode(bytes),
    ) as JsonWebKey;
    return crypto.subtle.importKey("jwk", privateKeyJwk, ECDSA_PARAMS, false, [
      "sign",
    ]);
  } catch (err) {
    if (isCryptoOperationError(err)) {
      throw new Error(
        "Device key could not be unlocked. Reset P2P sync in Settings, then set your sync password again.",
      );
    }
    throw err;
  }
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
  try {
    const privateKey = await importPrivateKey(record, password);
    const data = toArrayBuffer(
      new TextEncoder().encode(buildSignaturePayload(parts)),
    );
    const signature = await crypto.subtle.sign(SIGN_PARAMS, privateKey, data);
    return toBase64(new Uint8Array(signature));
  } catch (err) {
    if (err instanceof Error && err.message === "Wrong sync password") throw err;
    throw new Error(formatCryptoError(err, "Could not sign sync packet"));
  }
}

export async function verifyPayload(
  publicKeyJwk: JsonWebKey,
  parts: Record<string, string>,
  signature: string,
): Promise<boolean> {
  try {
    const publicKey = await importPublicKey(publicKeyJwk);
    const data = toArrayBuffer(
      new TextEncoder().encode(buildSignaturePayload(parts)),
    );
    return crypto.subtle.verify(
      SIGN_PARAMS,
      publicKey,
      toArrayBuffer(fromBase64(signature)),
      data,
    );
  } catch {
    return false;
  }
}