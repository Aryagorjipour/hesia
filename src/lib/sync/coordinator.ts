import { v4 as uuidv4 } from "uuid";
import {
  collectSyncBundle,
  chunkString,
  getSyncPreview,
} from "@/lib/sync/bundle-export";
import { mergeSyncBundle } from "@/lib/sync/bundle-import";
import {
  createChannelKey,
  decryptWithKey,
  encryptWithKey,
  sha256Hex,
} from "@/lib/sync/crypto";
import { RelayClient } from "@/lib/sync/relay-client";
import { SyncPeer } from "@/lib/sync/peer";
import type { SyncExportBundle } from "@/lib/sync/bundle-export";
import type {
  MergeStats,
  RelayPeer,
  RelaySignalKind,
  SyncChannelMessage,
  TransferProgress,
} from "@/types/device-sync";
import { SyncChannelMessageSchema } from "@/types/device-sync";

export interface CoordinatorOptions {
  deviceId: string;
  label: string;
  onPeers?: (peers: RelayPeer[]) => void;
  onProgress?: (progress: TransferProgress) => void;
  onIncomingRequest?: (
    from: RelayPeer,
    sessionId: string,
    preview: { tasks: number; tags: number; categories: number },
  ) => void;
  onError?: (message: string) => void;
}

interface ActiveSession {
  sessionId: string;
  remoteDeviceId: string;
  role: "offerer" | "answerer";
  password: string;
  peer: SyncPeer;
}

export class DeviceSyncCoordinator {
  private relay: RelayClient | null = null;
  private opts: CoordinatorOptions;
  private session: ActiveSession | null = null;
  private incomingRequests = new Map<
    string,
    { sessionId: string; preview: { tasks: number; tags: number; categories: number } }
  >();
  private pendingSend: {
    sessionId: string;
    targetDeviceId: string;
    password: string;
    resolve: () => void;
    reject: (err: Error) => void;
    timeout: number;
  } | null = null;

  constructor(opts: CoordinatorOptions) {
    this.opts = opts;
  }

  get connected(): boolean {
    return this.relay?.connected ?? false;
  }

  get peers(): RelayPeer[] {
    return this.relay?.getPeerList() ?? [];
  }

  async connect(relayUrl: string, pin?: string): Promise<void> {
    this.disconnect();
    const relay = new RelayClient({
      url: relayUrl,
      deviceId: this.opts.deviceId,
      label: this.opts.label,
      pin,
      onPeers: (peers) => this.opts.onPeers?.(peers),
      onSignal: (from, kind, payload) => {
        void this.handleSignal(from, kind, payload);
      },
      onError: (message) => this.opts.onError?.(message),
      onDisconnect: () => this.opts.onPeers?.([]),
    });
    await relay.connect();
    this.relay = relay;
  }

  disconnect(): void {
    if (this.pendingSend) {
      window.clearTimeout(this.pendingSend.timeout);
      this.pendingSend = null;
    }
    this.session?.peer.close();
    this.session = null;
    this.incomingRequests.clear();
    this.relay?.disconnect();
    this.relay = null;
  }

  sendToDevice(targetDeviceId: string, password: string): Promise<void> {
    if (!this.relay) return Promise.reject(new Error("Not connected to relay"));

    const sessionId = uuidv4();
    return getSyncPreview().then((preview) => {
      this.opts.onProgress?.({
        phase: "connecting",
        message: "Waiting for other device to accept…",
      });

      return new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          this.pendingSend = null;
          reject(new Error("Sync request timed out"));
        }, 90_000);

        this.pendingSend = {
          sessionId,
          targetDeviceId,
          password,
          resolve,
          reject,
          timeout,
        };

        this.relay!.sendSignal(targetDeviceId, "sync-request", {
          sessionId,
          preview,
        });
      }).then(() => this.runSender(sessionId, targetDeviceId, password));
    });
  }

  acceptRequest(fromDeviceId: string, password: string): Promise<MergeStats> {
    const pending = this.incomingRequests.get(fromDeviceId);
    if (!pending) return Promise.reject(new Error("No pending sync request"));
    if (!this.relay) return Promise.reject(new Error("Not connected to relay"));

    this.incomingRequests.delete(fromDeviceId);
    this.relay.sendSignal(fromDeviceId, "sync-accept", {
      sessionId: pending.sessionId,
    });

    return this.runReceiver(pending.sessionId, fromDeviceId, password);
  }

  rejectRequest(fromDeviceId: string, reason?: string): void {
    const pending = this.incomingRequests.get(fromDeviceId);
    if (!pending || !this.relay) return;
    this.incomingRequests.delete(fromDeviceId);
    this.relay.sendSignal(fromDeviceId, "sync-reject", {
      sessionId: pending.sessionId,
      reason,
    });
  }

  private async handleSignal(
    from: string,
    kind: RelaySignalKind,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (kind === "sync-request") {
      const sessionId = String(payload.sessionId ?? "");
      const preview = payload.preview as {
        tasks: number;
        tags: number;
        categories: number;
      };
      if (!sessionId || !preview) return;
      this.incomingRequests.set(from, { sessionId, preview });
      const peer = this.peers.find((p) => p.deviceId === from) ?? {
        deviceId: from,
        label: from.slice(0, 8),
      };
      this.opts.onIncomingRequest?.(peer, sessionId, preview);
      return;
    }

    if (kind === "sync-reject" && this.pendingSend) {
      if (payload.sessionId === this.pendingSend.sessionId) {
        window.clearTimeout(this.pendingSend.timeout);
        this.pendingSend.reject(
          new Error(String(payload.reason ?? "Sync rejected")),
        );
        this.pendingSend = null;
      }
      return;
    }

    if (kind === "sync-accept" && this.pendingSend) {
      if (
        from === this.pendingSend.targetDeviceId &&
        payload.sessionId === this.pendingSend.sessionId
      ) {
        window.clearTimeout(this.pendingSend.timeout);
        const pending = this.pendingSend;
        this.pendingSend = null;
        pending.resolve();
      }
      return;
    }

    if (!this.session || this.session.remoteDeviceId !== from) return;

    try {
      if (kind === "offer" && this.session.role === "answerer") {
        const sdp = String((payload as { sdp?: string }).sdp ?? "");
        const answerSdp = await this.session.peer.applyOfferAndCreateAnswer(sdp);
        this.relay?.sendSignal(from, "answer", { sdp: answerSdp });
        return;
      }

      if (kind === "answer" && this.session.role === "offerer") {
        const sdp = String((payload as { sdp?: string }).sdp ?? "");
        await this.session.peer.applyAnswer(sdp);
        return;
      }

      if (kind === "ice") {
        const candidate =
          (payload as { candidate?: RTCIceCandidateInit | null }).candidate ?? null;
        await this.session.peer.addIceCandidate(candidate);
      }
    } catch (err) {
      this.opts.onError?.(
        err instanceof Error ? err.message : "Signaling failed",
      );
    }
  }

  private createPeer(
    role: "offerer" | "answerer",
    remoteDeviceId: string,
  ): SyncPeer {
    return SyncPeer.create(role, {
      onIceCandidate: (candidate) => {
        this.relay?.sendSignal(remoteDeviceId, "ice", { candidate });
      },
      onError: (err) => this.opts.onError?.(err.message),
    });
  }

  private async runSender(
    sessionId: string,
    remoteDeviceId: string,
    password: string,
  ): Promise<void> {
    this.session?.peer.close();
    const peer = this.createPeer("offerer", remoteDeviceId);
    this.session = {
      sessionId,
      remoteDeviceId,
      role: "offerer",
      password,
      peer,
    };

    this.opts.onProgress?.({ phase: "connecting", message: "Opening connection…" });

    const offerSdp = await peer.createOffer();
    this.relay?.sendSignal(remoteDeviceId, "offer", { sdp: offerSdp });

    const connected = await peer.waitForConnection();
    if (!connected) throw new Error("Could not connect to peer");

    this.opts.onProgress?.({ phase: "transferring", message: "Sending data…" });

    const bundle = await collectSyncBundle();
    const json = JSON.stringify(bundle);
    const chunks = chunkString(json);
    const checksum = await sha256Hex(json);
    const key = await createChannelKey(password, sessionId);

    for (let i = 0; i < chunks.length; i++) {
      const encrypted = await encryptWithKey(
        key,
        JSON.stringify({ index: i, total: chunks.length, chunk: chunks[i] }),
      );
      const message: SyncChannelMessage = {
        type: "sync-bundle-chunk",
        index: i,
        total: chunks.length,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
      };
      peer.send(JSON.stringify(message));
      this.opts.onProgress?.({
        phase: "transferring",
        chunkIndex: i + 1,
        chunkTotal: chunks.length,
        message: `Sending ${i + 1}/${chunks.length}`,
      });
    }

    peer.send(
      JSON.stringify({
        type: "sync-complete",
        exportedAt: bundle.exportedAt,
        checksum,
      } satisfies SyncChannelMessage),
    );

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error("Ack timeout")),
        90_000,
      );
      peer.setHandlers({
        onMessage: (raw) => {
          try {
            const msg = SyncChannelMessageSchema.parse(JSON.parse(raw));
            if (msg.type === "sync-ack") {
              window.clearTimeout(timeout);
              if (!msg.ok) reject(new Error(msg.error ?? "Receiver rejected sync"));
              else resolve();
            }
          } catch {
            // ignore non-ack frames
          }
        },
      });
    });

    this.opts.onProgress?.({ phase: "done", message: "Sync sent" });
    peer.close();
    this.session = null;
  }

  private async runReceiver(
    sessionId: string,
    remoteDeviceId: string,
    password: string,
  ): Promise<MergeStats> {
    this.session?.peer.close();
    const peer = this.createPeer("answerer", remoteDeviceId);
    this.session = {
      sessionId,
      remoteDeviceId,
      role: "answerer",
      password,
      peer,
    };

    this.opts.onProgress?.({ phase: "connecting", message: "Waiting for connection…" });

    const connected = await peer.waitForConnection();
    if (!connected) throw new Error("Could not connect to peer");

    const key = await createChannelKey(password, sessionId);
    const chunkMap = new Map<number, string>();
    let expectedTotal = 0;

    const stats = await new Promise<MergeStats>((resolve, reject) => {
      peer.setHandlers({
        onMessage: (raw) => {
          void (async () => {
            try {
              const msg = SyncChannelMessageSchema.parse(JSON.parse(raw));
              if (msg.type === "sync-bundle-chunk") {
                const plaintext = await decryptWithKey(key, msg.iv, msg.ciphertext);
                const part = JSON.parse(plaintext) as {
                  index: number;
                  total: number;
                  chunk: string;
                };
                chunkMap.set(part.index, part.chunk);
                expectedTotal = part.total;
                this.opts.onProgress?.({
                  phase: "transferring",
                  chunkIndex: part.index + 1,
                  chunkTotal: part.total,
                  message: `Receiving ${part.index + 1}/${part.total}`,
                });
              }
              if (msg.type === "sync-complete") {
                this.opts.onProgress?.({ phase: "merging", message: "Applying data…" });
                const parts: string[] = [];
                for (let i = 0; i < expectedTotal; i++) {
                  const part = chunkMap.get(i);
                  if (!part) throw new Error("Incomplete sync bundle");
                  parts.push(part);
                }
                const json = parts.join("");
                const checksum = await sha256Hex(json);
                if (checksum !== msg.checksum) {
                  throw new Error("Checksum mismatch");
                }
                const bundle = JSON.parse(json) as SyncExportBundle;
                const mergeStats = await mergeSyncBundle(bundle);
                peer.send(
                  JSON.stringify({
                    type: "sync-ack",
                    ok: true,
                    stats: mergeStats,
                  } satisfies SyncChannelMessage),
                );
                this.opts.onProgress?.({ phase: "done", message: "Sync applied" });
                resolve(mergeStats);
              }
              if (msg.type === "sync-abort") {
                reject(new Error(msg.message));
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : "Receive failed";
              try {
                peer.send(
                  JSON.stringify({
                    type: "sync-ack",
                    ok: false,
                    error: message,
                  } satisfies SyncChannelMessage),
                );
              } catch {
                // ignore
              }
              reject(err instanceof Error ? err : new Error(message));
            }
          })();
        },
      });
    });

    peer.close();
    this.session = null;
    return stats;
  }
}