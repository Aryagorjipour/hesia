import type { P2pSyncSettings } from "@/types/p2p-sync";

const PUBLIC_TURN: RTCIceServer = {
  urls: [
    "turn:openrelay.metered.ca:80",
    "turn:openrelay.metered.ca:443",
    "turns:openrelay.metered.ca:443",
  ],
  username: "openrelayproject",
  credential: "openrelayproject",
};

export function buildIceServers(settings?: P2pSyncSettings): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  if (settings?.usePublicTurn !== false) {
    servers.push(PUBLIC_TURN);
  }

  const customUrls = settings?.turnUrls
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (customUrls && customUrls.length > 0) {
    servers.push({
      urls: customUrls,
      username: settings?.turnUsername || undefined,
      credential: settings?.turnCredential || undefined,
    });
  }

  return servers;
}