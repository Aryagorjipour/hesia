import type { RelayPeer, RelaySignalKind } from "@/types/device-sync";

export type RelayInbound =
  | { type: "joined"; deviceId: string; peers: RelayPeer[] }
  | { type: "peers"; peers: RelayPeer[] }
  | { type: "peer-joined"; peer: RelayPeer }
  | { type: "peer-left"; deviceId: string }
  | {
      type: "signal";
      from: string;
      to: string;
      kind: RelaySignalKind;
      payload: Record<string, unknown>;
    }
  | { type: "error"; message: string };

export interface RelayClientOptions {
  url: string;
  deviceId: string;
  label: string;
  pin?: string;
  onPeers?: (peers: RelayPeer[]) => void;
  onPeerJoined?: (peer: RelayPeer) => void;
  onPeerLeft?: (deviceId: string) => void;
  onSignal?: (from: string, kind: RelaySignalKind, payload: Record<string, unknown>) => void;
  onError?: (message: string) => void;
  onDisconnect?: () => void;
}

export class RelayClient {
  private ws: WebSocket | null = null;
  private opts: RelayClientOptions;
  private peers: RelayPeer[] = [];

  constructor(opts: RelayClientOptions) {
    this.opts = opts;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getPeerList(): RelayPeer[] {
    return [...this.peers];
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws) this.disconnect();

      let settled = false;
      const ws = new WebSocket(this.opts.url);
      this.ws = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "join",
            deviceId: this.opts.deviceId,
            label: this.opts.label,
            pin: this.opts.pin,
          }),
        );
      };

      ws.onmessage = (event) => {
        let msg: RelayInbound;
        try {
          msg = JSON.parse(String(event.data)) as RelayInbound;
        } catch {
          return;
        }

        if (msg.type === "joined") {
          this.peers = msg.peers;
          this.opts.onPeers?.(this.peers);
          if (!settled) {
            settled = true;
            resolve();
          }
          return;
        }

        if (msg.type === "peers") {
          this.peers = msg.peers;
          this.opts.onPeers?.(this.peers);
          return;
        }

        if (msg.type === "peer-joined") {
          if (!this.peers.some((p) => p.deviceId === msg.peer.deviceId)) {
            this.peers.push(msg.peer);
          }
          this.opts.onPeerJoined?.(msg.peer);
          this.opts.onPeers?.(this.peers);
          return;
        }

        if (msg.type === "peer-left") {
          this.peers = this.peers.filter((p) => p.deviceId !== msg.deviceId);
          this.opts.onPeerLeft?.(msg.deviceId);
          this.opts.onPeers?.(this.peers);
          return;
        }

        if (msg.type === "signal") {
          this.opts.onSignal?.(msg.from, msg.kind, msg.payload);
          return;
        }

        if (msg.type === "error") {
          this.opts.onError?.(msg.message);
          if (!settled) {
            settled = true;
            reject(new Error(msg.message));
          }
        }
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error("Could not connect to sync relay"));
        }
      };

      ws.onclose = () => {
        this.ws = null;
        this.opts.onDisconnect?.();
        if (!settled) {
          settled = true;
          reject(new Error("Relay connection closed"));
        }
      };
    });
  }

  sendSignal(
    to: string,
    kind: RelaySignalKind,
    payload: Record<string, unknown>,
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Relay not connected");
    }
    this.ws.send(
      JSON.stringify({
        type: "signal",
        from: this.opts.deviceId,
        to,
        kind,
        payload,
      }),
    );
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.peers = [];
  }
}

export function normalizeRelayUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Relay URL required");
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    return trimmed.replace(/\/$/, "");
  }
  if (trimmed.startsWith("http://")) {
    return `ws://${trimmed.slice("http://".length).replace(/\/$/, "")}`;
  }
  if (trimmed.startsWith("https://")) {
    return `wss://${trimmed.slice("https://".length).replace(/\/$/, "")}`;
  }
  return `ws://${trimmed.replace(/\/$/, "")}`;
}

export function isMixedContentRisk(relayUrl: string): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.protocol === "https:" && relayUrl.startsWith("ws://")
  );
}