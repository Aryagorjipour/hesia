import type { P2pSyncSettings } from "@/types/p2p-sync";

/** Single STUN — enough for same-LAN and keeps ICE discovery fast. */
const LAN_STUN: RTCIceServer = {
  urls: "stun:stun.l.google.com:19302",
};

const STATIC_TURN_HOST = "staticauth.openrelay.metered.ca";
const STATIC_TURN_SECRET = "openrelayprojectsecret";

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/** Coturn time-limited credentials for staticauth.openrelay.metered.ca */
export async function buildPublicTurnServer(): Promise<RTCIceServer> {
  const ttlSeconds = 3600;
  const username = String(Math.floor(Date.now() / 1000) + ttlSeconds);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(STATIC_TURN_SECRET),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(username),
  );
  return {
    urls: `turn:${STATIC_TURN_HOST}:80?transport=udp`,
    username,
    credential: toBase64(new Uint8Array(signature)),
  };
}

export async function buildIceServers(
  settings?: P2pSyncSettings,
): Promise<RTCIceServer[]> {
  const servers: RTCIceServer[] = [LAN_STUN];

  const customUrls = settings?.turnUrls
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (customUrls && customUrls.length > 0) {
    servers.push({
      urls: customUrls.length === 1 ? customUrls[0]! : customUrls,
      username: settings?.turnUsername || undefined,
      credential: settings?.turnCredential || undefined,
    });
    return servers;
  }

  if (settings?.usePublicTurn === true) {
    servers.push(await buildPublicTurnServer());
  }

  return servers;
}

export function isTurnEnabled(settings?: P2pSyncSettings): boolean {
  if (settings?.turnUrls?.trim()) return true;
  return settings?.usePublicTurn === true;
}