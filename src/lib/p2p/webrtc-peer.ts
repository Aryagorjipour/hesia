import { buildIceServers } from "@/lib/p2p/ice-config";
import type { P2pSyncSettings } from "@/types/p2p-sync";

export type PeerRole = "sender" | "receiver";

export interface WebRtcPeerOptions {
  role: PeerRole;
  p2pSettings?: P2pSyncSettings;
  onOpen?: () => void;
  onMessage?: (data: string) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

const ICE_GATHER_TIMEOUT_MS = 3000;
const CONNECTION_TIMEOUT_MS = 12000;

export class WebRtcPeer {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private handlers: WebRtcPeerOptions;
  private pendingCandidates: string[] = [];
  private appliedCandidates = new Set<string>();

  constructor(options: WebRtcPeerOptions) {
    this.handlers = options;
    this.pc = new RTCPeerConnection({
      iceServers: buildIceServers(options.p2pSettings),
      iceCandidatePoolSize: 0,
    });

    this.pc.onicecandidate = (event) => {
      if (!event.candidate?.candidate) return;
      const line = event.candidate.candidate;
      if (!this.appliedCandidates.has(line)) {
        this.pendingCandidates.push(line);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState;
      if (state === "failed" || state === "disconnected") {
        this.handlers.onError?.(
          new Error(
            "WebRTC connection failed — try same Wi‑Fi, enable TURN, or scan the ICE patch QR",
          ),
        );
      }
    };

    if (options.role === "sender") {
      this.channel = this.pc.createDataChannel("hesia-sync", { ordered: true });
      this.bindChannel(this.channel);
    } else {
      this.pc.ondatachannel = (event) => {
        this.channel = event.channel;
        this.bindChannel(event.channel);
      };
    }
  }

  setHandlers(handlers: Partial<WebRtcPeerOptions>) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  private bindChannel(channel: RTCDataChannel) {
    channel.onopen = () => this.handlers.onOpen?.();
    channel.onclose = () => this.handlers.onClose?.();
    channel.onerror = () =>
      this.handlers.onError?.(new Error("Data channel error"));
    channel.onmessage = (event) => {
      if (typeof event.data === "string") {
        this.handlers.onMessage?.(event.data);
      }
    };
  }

  private async waitForIceGathering(): Promise<void> {
    if (this.pc.iceGatheringState === "complete") return;
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.pc.iceGatheringState === "complete") {
          this.pc.removeEventListener("icegatheringstatechange", check);
          resolve();
        }
      };
      this.pc.addEventListener("icegatheringstatechange", check);
      setTimeout(() => {
        this.pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }, ICE_GATHER_TIMEOUT_MS);
    });
  }

  async createOffer(): Promise<string> {
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.waitForIceGathering();
      if (!this.pc.localDescription?.sdp) {
        throw new Error("Failed to create WebRTC offer");
      }
      return this.pc.localDescription.sdp;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "WebRTC is unavailable";
      if (message.includes("operation-specific")) {
        throw new Error(
          "WebRTC failed on this device. Use Safari or Chrome, avoid Private Browsing, and allow local network access.",
        );
      }
      throw err instanceof Error ? err : new Error(message);
    }
  }

  async applyOfferAndCreateAnswer(offerSdp: string): Promise<string> {
    await this.pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.waitForIceGathering();
    if (!this.pc.localDescription?.sdp) {
      throw new Error("Failed to create WebRTC answer");
    }
    return this.pc.localDescription.sdp;
  }

  async applyAnswer(answerSdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  async waitForConnection(timeoutMs = CONNECTION_TIMEOUT_MS): Promise<boolean> {
    if (this.isConnected()) return true;

    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => resolve(false), timeoutMs);
      const check = () => {
        if (this.isConnected()) {
          window.clearTimeout(timeout);
          this.pc.removeEventListener("connectionstatechange", check);
          this.pc.removeEventListener("iceconnectionstatechange", check);
          resolve(true);
        }
      };
      this.pc.addEventListener("connectionstatechange", check);
      this.pc.addEventListener("iceconnectionstatechange", check);
      check();
    });
  }

  isConnected(): boolean {
    const ice = this.pc.iceConnectionState;
    const conn = this.pc.connectionState;
    return (
      ice === "connected" ||
      ice === "completed" ||
      conn === "connected"
    );
  }

  getPendingCandidates(): string[] {
    return [...this.pendingCandidates];
  }

  async applyRemoteCandidates(candidates: string[]): Promise<void> {
    for (const candidate of candidates) {
      if (this.appliedCandidates.has(candidate)) continue;
      try {
        await this.pc.addIceCandidate({
          candidate,
          sdpMid: "0",
          sdpMLineIndex: 0,
        });
        this.appliedCandidates.add(candidate);
      } catch {
        // ignore candidates that arrive after negotiation completes
      }
    }
  }

  send(data: string): void {
    if (!this.channel || this.channel.readyState !== "open") {
      throw new Error("Data channel is not open");
    }
    this.channel.send(data);
  }

  close(): void {
    this.channel?.close();
    this.pc.close();
  }
}