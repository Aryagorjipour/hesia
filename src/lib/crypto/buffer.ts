/** Copy bytes into a standalone ArrayBuffer — required for iOS Safari Web Crypto. */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function isCryptoOperationError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "OperationError" || err.name === "InvalidAccessError")
  );
}

export function formatCryptoError(err: unknown, context: string): string {
  if (isCryptoOperationError(err)) {
    return `${context} failed on this device. Check your sync password, or reset P2P sync in Settings and set up again.`;
  }
  if (err instanceof Error) return err.message;
  return context;
}