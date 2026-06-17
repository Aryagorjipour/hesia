import {
  AnswerPacketSchema,
  IcePatchPacketSchema,
  OfferPacketSchema,
  P2P_MAX_ENCODED_CHARS,
  P2P_SESSION_TTL_MS,
  type AnswerPacket,
  type IcePatchPacket,
  type OfferPacket,
} from "@/types/p2p-sync";

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(atob(padded + pad), (c) => c.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function maybeCompressJson(payload: unknown): Promise<string> {
  const json = JSON.stringify(payload);
  if (json.length <= 1500 || typeof CompressionStream === "undefined") {
    return toBase64Url(new TextEncoder().encode(json));
  }

  const stream = new Blob([json])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return `z.${toBase64Url(new Uint8Array(buffer))}`;
}

async function maybeDecompressJson<T>(encoded: string): Promise<T> {
  if (encoded.startsWith("z.")) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("Offer code incomplete (scan again)");
    }
    const bytes = fromBase64Url(encoded.slice(2));
    const stream = new Blob([toArrayBuffer(bytes)])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    const text = await new Response(stream).text();
    return JSON.parse(text) as T;
  }

  try {
    const bytes = fromBase64Url(encoded);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Offer code incomplete (scan again)");
  }
}

export function createSessionExpiry(): string {
  return new Date(Date.now() + P2P_SESSION_TTL_MS).toISOString();
}

export function isPacketExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) < Date.now();
}

function assertEncodedSize(encoded: string, label: string): void {
  if (encoded.length > P2P_MAX_ENCODED_CHARS) {
    throw new Error(
      `${label} is too large for QR (${encoded.length} chars). Use copy/paste instead.`,
    );
  }
}

export async function encodeOfferPacket(packet: OfferPacket): Promise<string> {
  const encoded = await maybeCompressJson(packet);
  assertEncodedSize(encoded, "Offer code");
  return encoded;
}

export async function decodeOfferPacket(encoded: string): Promise<OfferPacket> {
  if (!encoded || encoded.length < 100) {
    throw new Error("Offer code incomplete (scan again)");
  }

  let packet: OfferPacket;
  try {
    packet = await maybeDecompressJson<OfferPacket>(encoded.trim());
  } catch (err) {
    if (err instanceof Error && err.message.includes("incomplete")) throw err;
    throw new Error("Offer code incomplete (scan again)");
  }

  const parsed = OfferPacketSchema.safeParse(packet);
  if (!parsed.success) {
    throw new Error("Unsupported or invalid offer packet");
  }
  if (isPacketExpired(parsed.data.expiresAt)) {
    throw new Error("Offer expired — start a new sync session");
  }
  return parsed.data;
}

export async function encodeAnswerPacket(packet: AnswerPacket): Promise<string> {
  const encoded = await maybeCompressJson(packet);
  assertEncodedSize(encoded, "Answer code");
  return encoded;
}

export async function decodeAnswerPacket(encoded: string): Promise<AnswerPacket> {
  if (!encoded || encoded.length < 100) {
    throw new Error("Answer code incomplete (scan again)");
  }

  let packet: AnswerPacket;
  try {
    packet = await maybeDecompressJson<AnswerPacket>(encoded.trim());
  } catch (err) {
    if (err instanceof Error && err.message.includes("incomplete")) throw err;
    throw new Error("Answer code incomplete (scan again)");
  }

  const parsed = AnswerPacketSchema.safeParse(packet);
  if (!parsed.success) {
    throw new Error("Unsupported or invalid answer packet");
  }
  if (isPacketExpired(parsed.data.expiresAt)) {
    throw new Error("Answer expired — start a new sync session");
  }
  return parsed.data;
}

export async function encodeIcePatchPacket(packet: IcePatchPacket): Promise<string> {
  const encoded = await maybeCompressJson(packet);
  assertEncodedSize(encoded, "ICE patch code");
  return encoded;
}

export async function decodeIcePatchPacket(encoded: string): Promise<IcePatchPacket> {
  if (!encoded || encoded.length < 40) {
    throw new Error("ICE patch code incomplete (scan again)");
  }

  const packet = await maybeDecompressJson<IcePatchPacket>(encoded.trim());
  const parsed = IcePatchPacketSchema.safeParse(packet);
  if (!parsed.success) {
    throw new Error("Unsupported or invalid ICE patch packet");
  }
  if (isPacketExpired(parsed.data.expiresAt)) {
    throw new Error("ICE patch expired — start a new sync session");
  }
  return parsed.data;
}