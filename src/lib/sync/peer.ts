export type PeerRole = "offerer" | "answerer";

export interface SyncPeerHandlers {
  onOpen?: () => void;
  onMessage?: (data: string) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit | null) => void;
}

const ICE_GATHER_TIMEOUT_MS = 12_000;
const CONNECTION_TIMEOUT_MS = 45_000;

export class SyncPeer {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private handlers: SyncPeerHandlers;
  private role: PeerRole;

  private constructor(role: PeerRole, handlers: SyncPeerHandlers) {
    this.role = role;
    this.handlers = handlers;
    this.pc = new RTCPeerConnection({ iceServers: [] });

    this.pc.onicecandidate = (event) => {
      this.handlers.onIceCandidate?.(
        event.candidate
          ? {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid ?? undefined,
              sdpMLineIndex: event.candidate.sdpMLineIndex ?? undefined,
            }
          : null,
      );
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === "failed") {
        this.handlers.onError?.(
          new Error(
            "Direct connection failed — same Wi‑Fi, relay running on desktop, allow local network in Chrome",
          ),
        );
      }
    };

    if (role === "offerer") {
      this.channel = this.pc.createDataChannel("hesia-sync", { ordered: true });
      this.bindChannel(this.channel);
    } else {
      this.pc.ondatachannel = (event) => {
        this.channel = event.channel;
        this.bindChannel(event.channel);
      };
    }
  }

  static create(role: PeerRole, handlers: SyncPeerHandlers): SyncPeer {
    return new SyncPeer(role, handlers);
  }

  setHandlers(handlers: Partial<SyncPeerHandlers>) {
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
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.waitForIceGathering();
    if (!this.pc.localDescription?.sdp) {
      throw new Error("Failed to create WebRTC offer");
    }
    return this.pc.localDescription.sdp;
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

  async addIceCandidate(candidate: RTCIceCandidateInit | null): Promise<void> {
    if (!candidate?.candidate) return;
    try {
      await this.pc.addIceCandidate(candidate);
    } catch {
      try {
        await this.pc.addIceCandidate({
          ...candidate,
          sdpMid: candidate.sdpMid ?? "0",
          sdpMLineIndex: candidate.sdpMLineIndex ?? 0,
        });
      } catch {
        // redundant or late candidate
      }
    }
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