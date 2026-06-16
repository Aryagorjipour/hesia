import { z } from "zod";

const PBKDF2_ITERATIONS = 250_000;

export const EncryptedExportWrapperSchema = z.object({
  format: z.enum(["hesia-encrypted-v1", "aether-encrypted-v1"]),
  exportedAt: z.string().datetime(),
  salt: z.string(),
  iv: z.string(),
  ciphertext: z.string(),
});

export type EncryptedExportWrapper = z.infer<
  typeof EncryptedExportWrapperSchema
>;

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

async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptExportPayload(
  plaintext: string,
  password: string,
): Promise<EncryptedExportWrapper> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBuffer(iv) },
    key,
    encoded,
  );

  return {
    format: "hesia-encrypted-v1",
    exportedAt: new Date().toISOString(),
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(cipher)),
  };
}

export async function decryptExportPayload(
  wrapper: EncryptedExportWrapper,
  password: string,
): Promise<string> {
  const salt = fromBase64(wrapper.salt);
  const iv = fromBase64(wrapper.iv);
  const data = fromBase64(wrapper.ciphertext);
  const key = await deriveKey(password, salt);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toBuffer(iv) },
      key,
      toBuffer(data),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("Incorrect password or corrupted export file");
  }
}

export function isEncryptedExport(raw: unknown): raw is EncryptedExportWrapper {
  return EncryptedExportWrapperSchema.safeParse(raw).success;
}