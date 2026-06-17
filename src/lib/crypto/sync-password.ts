import { toArrayBuffer } from "./buffer";

const PBKDF2_ITERATIONS = 250_000;

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

export interface PasswordVerifier {
  salt: string;
  hash: string;
}

async function deriveVerifierBytes(
  password: string,
  salt: Uint8Array,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(encoder.encode(password)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
}

export async function createPasswordVerifier(
  password: string,
): Promise<PasswordVerifier> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveVerifierBytes(password, salt);
  return {
    salt: toBase64(salt),
    hash: toBase64(new Uint8Array(hash)),
  };
}

export async function verifyPassword(
  password: string,
  verifier: PasswordVerifier,
): Promise<boolean> {
  const salt = fromBase64(verifier.salt);
  const expected = fromBase64(verifier.hash);
  const actual = new Uint8Array(await deriveVerifierBytes(password, salt));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}

export async function deriveSyncKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(encoder.encode(password)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}