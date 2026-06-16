import {
  AnswerPacketSchema,
  OfferPacketSchema,
  P2P_SESSION_TTL_MS,
  type AnswerPacket,
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
  const bytes = Uint8Array.from(atob(padded + pad), (c) => c.charCodeAt(0));
  return new Uint8Array(bytes);
}

async function compressJson(payload: unknown): Promise<string> {
  const json = JSON.stringify(payload);
  if (typeof CompressionStream !== "undefined") {
    const stream = new Blob([json])
      .stream()
      .pipeThrough(new CompressionStream("gzip"));
    const buffer = await new Response(stream).arrayBuffer();
    return toBase64Url(new Uint8Array(buffer));
  }
  return toBase64Url(new TextEncoder().encode(json));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function decompressJson<T>(encoded: string): Promise<T> {
  const bytes = fromBase64Url(encoded);
  if (typeof DecompressionStream !== "undefined") {
    const stream = new Blob([toArrayBuffer(bytes)])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    const text = await new Response(stream).text();
    return JSON.parse(text) as T;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export function createSessionExpiry(): string {
  return new Date(Date.now() + P2P_SESSION_TTL_MS).toISOString();
}

export function isPacketExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) < Date.now();
}

export async function encodeOfferPacket(packet: OfferPacket): Promise<string> {
  return compressJson(packet);
}

export async function decodeOfferPacket(encoded: string): Promise<OfferPacket> {
  const packet = await decompressJson<OfferPacket>(encoded);
  const parsed = OfferPacketSchema.safeParse(packet);
  if (!parsed.success) throw new Error("Invalid offer packet");
  if (isPacketExpired(parsed.data.expiresAt)) {
    throw new Error("Offer packet expired");
  }
  return parsed.data;
}

export async function encodeAnswerPacket(packet: AnswerPacket): Promise<string> {
  return compressJson(packet);
}

export async function decodeAnswerPacket(encoded: string): Promise<AnswerPacket> {
  const packet = await decompressJson<AnswerPacket>(encoded);
  const parsed = AnswerPacketSchema.safeParse(packet);
  if (!parsed.success) throw new Error("Invalid answer packet");
  if (isPacketExpired(parsed.data.expiresAt)) {
    throw new Error("Answer packet expired");
  }
  return parsed.data;
}