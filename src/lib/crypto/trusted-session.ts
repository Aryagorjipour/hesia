import { toArrayBuffer } from "./buffer";

const ECDH_PARAMS: EcKeyGenParams = {
  name: "ECDH",
  namedCurve: "P-256",
};

export async function generateEphemeralKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey"]);
}

export async function exportPublicKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

export async function importEcdhPublicKey(
  publicKeyJwk: JsonWebKey,
): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", publicKeyJwk, ECDH_PARAMS, true, []);
}

export async function deriveTrustedSessionKey(
  privateKey: CryptoKey,
  peerPublicKeyJwk: JsonWebKey,
): Promise<CryptoKey> {
  const peerPublicKey = await importEcdhPublicKey(peerPublicKeyJwk);
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: peerPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
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