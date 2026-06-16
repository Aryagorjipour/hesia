const ICE_CONFIG: RTCConfiguration = {
  iceServers: [],
  iceCandidatePoolSize: 0,
};

export type PeerRole = "sender" | "receiver";

export interface WebRtcPeerOptions {
  role: PeerRole;
  onOpen?: () => void;
  onMessage?: (data: string) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

export class WebRtcPeer {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private handlers: WebRtcPeerOptions;

  constructor(options: WebRtcPeerOptions) {
    this.handlers = options;
    this.pc = new RTCPeerConnection(ICE_CONFIG);

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === "failed") {
        this.handlers.onError?.(new Error("WebRTC connection failed"));
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
      }, 8000);
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