import { buildIceServers, isTurnEnabled } from "@/lib/p2p/ice-config";
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

const ICE_GATHER_TIMEOUT_MS = 12_000;
const CONNECTION_TIMEOUT_MS = 30_000;

export class WebRtcPeer {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private handlers: WebRtcPeerOptions;
  private pendingCandidates: string[] = [];
  private appliedCandidates = new Set<string>();
  private turnEnabled: boolean;

  private constructor(
    options: WebRtcPeerOptions,
    pcConfig: RTCConfiguration,
    turnEnabled: boolean,
  ) {
    this.handlers = options;
    this.turnEnabled = turnEnabled;
    this.pc = new RTCPeerConnection(pcConfig);

    this.pc.onicecandidate = (event) => {
      if (!event.candidate?.candidate) return;
      const line = event.candidate.candidate;
      if (!this.appliedCandidates.has(line)) {
        this.pendingCandidates.push(line);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState;
      if (state === "failed") {
        this.handlers.onError?.(new Error(this.iceFailureMessage()));
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

  static async create(options: WebRtcPeerOptions): Promise<WebRtcPeer> {
    const turnEnabled = isTurnEnabled(options.p2pSettings);
    const servers = await buildIceServers(options.p2pSettings);
    const pcConfig: RTCConfiguration = {
      iceServers: servers,
      bundlePolicy: "max-bundle",
    };
    if (turnEnabled) {
      pcConfig.iceCandidatePoolSize = 2;
      pcConfig.iceTransportPolicy = "all";
    }
    return new WebRtcPeer(options, pcConfig, turnEnabled);
  }

  private iceFailureMessage(): string {
    if (this.turnEnabled) {
      return "WebRTC connection failed — TURN relay could not connect. Try same Wi‑Fi with TURN off, or check your TURN settings.";
    }
    return "WebRTC connection failed — keep both devices on the same Wi‑Fi, disable TURN relay in Settings, and retry.";
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
          "WebRTC failed on this device. Use Chrome, avoid Private Browsing, and allow local network access.",
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
      const timeout = window.setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeoutMs);
      const cleanup = () => {
        this.pc.removeEventListener("connectionstatechange", check);
        this.pc.removeEventListener("iceconnectionstatechange", check);
      };
      const check = () => {
        const ice = this.pc.iceConnectionState;
        if (this.isConnected()) {
          window.clearTimeout(timeout);
          cleanup();
          resolve(true);
          return;
        }
        if (ice === "failed" || ice === "closed") {
          window.clearTimeout(timeout);
          cleanup();
          resolve(false);
        }
      };
      this.pc.addEventListener("connectionstatechange", check);
      this.pc.addEventListener("iceconnectionstatechange", check);
      check();
    });
  }

  isConnected(): boolean {
    const ice = this.pc.iceConnectionState;
    return ice === "connected" || ice === "completed";
  }

  getPendingCandidates(): string[] {
    return [...this.pendingCandidates];
  }

  async applyRemoteCandidates(candidates: string[]): Promise<void> {
    for (const candidate of candidates) {
      if (!candidate.trim() || this.appliedCandidates.has(candidate)) continue;

      const attempts: RTCIceCandidateInit[] = [
        { candidate },
        { candidate, sdpMid: "0", sdpMLineIndex: 0 },
      ];

      let applied = false;
      for (const init of attempts) {
        try {
          await this.pc.addIceCandidate(init);
          this.appliedCandidates.add(candidate);
          applied = true;
          break;
        } catch {
          // try next init shape
        }
      }

      if (!applied) {
        // candidate may already be redundant after gathering completed
      }
    }
  }

  async refreshLocalCandidates(): Promise<void> {
    if (typeof this.pc.restartIce !== "function") return;
    this.pc.restartIce();
    await this.waitForIceGathering();
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