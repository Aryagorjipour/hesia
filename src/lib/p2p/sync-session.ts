import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db/schema";
import {
  ensureDeviceIdentity,
  signPayload,
  verifyPayload,
} from "@/lib/crypto/device-identity";
import {
  deriveTrustedSessionKey,
  exportPublicKeyJwk,
  generateEphemeralKeyPair,
} from "@/lib/crypto/trusted-session";
import { verifyPassword } from "@/lib/crypto/sync-password";
import {
  chunkString,
  collectP2pBundle,
  getP2pPreview,
  sha256Hex,
} from "@/lib/p2p/sync-export";
import { mergeP2pBundle, type MergeStats } from "@/lib/p2p/sync-import";
import {
  createSessionExpiry,
  decodeAnswerPacket,
  decodeOfferPacket,
  encodeAnswerPacket,
  encodeOfferPacket,
} from "@/lib/p2p/signaling-codec";
import {
  createPasswordChannelCrypto,
  createTrustedChannelCrypto,
  decryptChunk,
  encryptChunk,
  SyncChannel,
  type SyncChannelCrypto,
} from "@/lib/p2p/sync-channel";
import { WebRtcPeer } from "@/lib/p2p/webrtc-peer";
import type { AnswerPacket, OfferPacket } from "@/types/p2p-sync";
import type { P2pExportBundle } from "@/lib/p2p/sync-export";

export interface SessionResult {
  stats?: MergeStats;
  error?: string;
}

export interface SenderSessionState {
  encoded: string;
  packet: OfferPacket;
  peer: WebRtcPeer;
  senderEphemeralPrivateKey?: CryptoKey;
}

export async function buildOfferPacket(
  password: string,
  deviceLabel: string,
): Promise<SenderSessionState> {
  const identity = await ensureDeviceIdentity(password);
  const preview = await getP2pPreview();
  const sessionId = uuidv4();
  const expiresAt = createSessionExpiry();
  const senderEphemeral = await generateEphemeralKeyPair();

  const peer = new WebRtcPeer({ role: "sender" });
  const sdp = await peer.createOffer();

  const signature = await signPayload(identity, password, {
    sessionId,
    deviceId: identity.deviceId,
    sdp,
    expiresAt,
  });

  const packet: OfferPacket = {
    v: 1,
    type: "offer",
    sessionId,
    deviceId: identity.deviceId,
    publicKeyJwk: identity.publicKeyJwk,
    deviceLabel,
    sdp,
    expiresAt,
    signature,
    ephemeralPublicKeyJwk: await exportPublicKeyJwk(senderEphemeral.publicKey),
    preview,
  };

  return {
    encoded: await encodeOfferPacket(packet),
    packet,
    peer,
    senderEphemeralPrivateKey: senderEphemeral.privateKey,
  };
}

export async function validateIncomingOffer(encoded: string) {
  const packet = await decodeOfferPacket(encoded);
  const valid = await verifyPayload(
    packet.publicKeyJwk,
    {
      sessionId: packet.sessionId,
      deviceId: packet.deviceId,
      sdp: packet.sdp,
      expiresAt: packet.expiresAt,
    },
    packet.signature,
  );
  if (!valid) throw new Error("Invalid offer signature");

  const trusted = await db.trustedSenders.get(packet.deviceId);
  const keyMismatch =
    trusted &&
    JSON.stringify(trusted.publicKeyJwk) !== JSON.stringify(packet.publicKeyJwk);

  return {
    packet,
    trusted: trusted && !keyMismatch ? trusted : null,
    keyMismatch: Boolean(keyMismatch),
  };
}

export interface ReceiverSessionState {
  encoded: string;
  packet: AnswerPacket;
  peer: WebRtcPeer;
  offerPacket: OfferPacket;
  receiverEphemeralPrivateKey?: CryptoKey;
}

export async function buildAnswerPacket(
  offerEncoded: string,
  password: string,
  options: {
    trustDevice?: boolean;
    senderPassword?: string;
  },
): Promise<ReceiverSessionState> {
  const { packet: offer, trusted, keyMismatch } =
    await validateIncomingOffer(offerEncoded);
  if (keyMismatch) throw new Error("Trusted device key mismatch");

  const settings = await db.settings.get("default");
  const verifier = settings?.p2pSync?.passwordVerifier;
  if (!trusted) {
    if (!options.senderPassword || !verifier) {
      throw new Error("Sync password required");
    }
    const ok = await verifyPassword(options.senderPassword, verifier);
    if (!ok) throw new Error("Incorrect sync password");
  }

  const identity = await ensureDeviceIdentity(password);
  const peer = new WebRtcPeer({ role: "receiver" });
  const sdp = await peer.applyOfferAndCreateAnswer(offer.sdp);
  const expiresAt = createSessionExpiry();
  const trustLevel = trusted ? "trusted" : "password";
  const receiverEphemeral =
    trustLevel === "trusted" ? await generateEphemeralKeyPair() : null;

  const signature = await signPayload(identity, password, {
    sessionId: offer.sessionId,
    deviceId: identity.deviceId,
    sdp,
    expiresAt,
  });

  const answer: AnswerPacket = {
    v: 1,
    type: "answer",
    sessionId: offer.sessionId,
    deviceId: identity.deviceId,
    publicKeyJwk: identity.publicKeyJwk,
    sdp,
    expiresAt,
    signature,
    trustLevel,
    ephemeralPublicKeyJwk: receiverEphemeral
      ? await exportPublicKeyJwk(receiverEphemeral.publicKey)
      : undefined,
  };

  if (options.trustDevice && !trusted) {
    await db.trustedSenders.put({
      deviceId: offer.deviceId,
      publicKeyJwk: offer.publicKeyJwk,
      label: offer.deviceLabel,
      trustedAt: new Date().toISOString(),
    });
  }

  return {
    encoded: await encodeAnswerPacket(answer),
    packet: answer,
    peer,
    offerPacket: offer,
    receiverEphemeralPrivateKey: receiverEphemeral?.privateKey,
  };
}

async function createSenderCrypto(
  answer: AnswerPacket,
  password: string,
  offer: OfferPacket,
  senderEphemeralPrivateKey?: CryptoKey,
): Promise<SyncChannelCrypto> {
  if (
    answer.trustLevel === "trusted" &&
    senderEphemeralPrivateKey &&
    answer.ephemeralPublicKeyJwk
  ) {
    return createTrustedChannelCrypto(
      await deriveTrustedSessionKey(
        senderEphemeralPrivateKey,
        answer.ephemeralPublicKeyJwk,
      ),
    );
  }
  return createPasswordChannelCrypto(password);
}

async function createReceiverCrypto(
  answer: AnswerPacket,
  password: string,
  offer: OfferPacket,
  receiverEphemeralPrivateKey?: CryptoKey,
): Promise<SyncChannelCrypto> {
  if (
    answer.trustLevel === "trusted" &&
    receiverEphemeralPrivateKey &&
    offer.ephemeralPublicKeyJwk
  ) {
    return createTrustedChannelCrypto(
      await deriveTrustedSessionKey(
        receiverEphemeralPrivateKey,
        offer.ephemeralPublicKeyJwk,
      ),
    );
  }
  return createPasswordChannelCrypto(password);
}

export function runSenderTransfer(
  peer: WebRtcPeer,
  offerPacket: OfferPacket,
  answerEncoded: string,
  password: string,
  senderEphemeralPrivateKey?: CryptoKey,
): Promise<SessionResult> {
  return new Promise((resolve) => {
    const channel = new SyncChannel(peer);
    let finished = false;

    const done = (result: SessionResult) => {
      if (finished) return;
      finished = true;
      peer.close();
      resolve(result);
    };

    channel.onMessage((message) => {
      if (message.type === "sync-ack") {
        if (message.ok) done({ stats: message.stats });
        else done({ error: message.error ?? "Sync rejected" });
      }
      if (message.type === "sync-abort") done({ error: message.message });
    });

    peer.setHandlers({
      onOpen: () => {
        void (async () => {
          try {
            const answer = await decodeAnswerPacket(answerEncoded);
            if (answer.sessionId !== offerPacket.sessionId) {
              throw new Error("Session ID mismatch");
            }
            const valid = await verifyPayload(
              answer.publicKeyJwk,
              {
                sessionId: answer.sessionId,
                deviceId: answer.deviceId,
                sdp: answer.sdp,
                expiresAt: answer.expiresAt,
              },
              answer.signature,
            );
            if (!valid) throw new Error("Invalid answer signature");

            const crypto = await createSenderCrypto(
              answer,
              password,
              offerPacket,
              senderEphemeralPrivateKey,
            );
            channel.setCrypto(crypto);

            const bundle = await collectP2pBundle();
            const json = JSON.stringify(bundle);
            const chunks = chunkString(json);
            const checksum = await sha256Hex(json);

            await channel.send({
              type: "sync-request",
              exportedAt: bundle.exportedAt,
              preview: {
                tasks: bundle.tasks.length,
                tags: bundle.tags.length,
                categories: bundle.categories.length,
              },
            });

            for (let i = 0; i < chunks.length; i++) {
              const encrypted = await encryptChunk(
                crypto,
                chunks[i],
                i,
                chunks.length,
              );
              await channel.send({
                type: "sync-bundle-chunk",
                index: i,
                total: chunks.length,
                ciphertext: encrypted.ciphertext,
                iv: encrypted.iv,
              });
            }

            await channel.send({
              type: "sync-complete",
              exportedAt: bundle.exportedAt,
              checksum,
            });
          } catch (err) {
            done({
              error: err instanceof Error ? err.message : "Failed to send sync",
            });
          }
        })();
      },
      onMessage: (data) => channel.handleRawMessage(data),
      onError: (err) => done({ error: err.message }),
    });

    void decodeAnswerPacket(answerEncoded)
      .then((answer) => peer.applyAnswer(answer.sdp))
      .catch((err) =>
        done({
          error: err instanceof Error ? err.message : "Failed to apply answer",
        }),
      );
  });
}

export function runReceiverTransfer(
  state: ReceiverSessionState,
  password: string,
): Promise<SessionResult> {
  const { peer, offerPacket, packet: answerPacket, receiverEphemeralPrivateKey } =
    state;

  return new Promise((resolve) => {
    const channel = new SyncChannel(peer);
    const chunkMap = new Map<number, string>();
    let expectedTotal = 0;
    let expectedChecksum = "";
    let cryptoReady: SyncChannelCrypto | null = null;
    let finished = false;

    const done = (result: SessionResult) => {
      if (finished) return;
      finished = true;
      peer.close();
      resolve(result);
    };

    const ensureCrypto = async () => {
      if (!cryptoReady) {
        cryptoReady = await createReceiverCrypto(
          answerPacket,
          password,
          offerPacket,
          receiverEphemeralPrivateKey,
        );
        channel.setCrypto(cryptoReady);
      }
      return cryptoReady;
    };

    const processComplete = async () => {
      try {
        await ensureCrypto();
        const parts: string[] = [];
        for (let i = 0; i < expectedTotal; i++) {
          const part = chunkMap.get(i);
          if (!part) throw new Error("Incomplete sync bundle");
          parts.push(part);
        }
        const json = parts.join("");
        const checksum = await sha256Hex(json);
        if (checksum !== expectedChecksum) {
          throw new Error("Sync checksum mismatch");
        }
        const bundle = JSON.parse(json) as P2pExportBundle;
        const stats = await mergeP2pBundle(bundle);
        await db.trustedSenders.update(offerPacket.deviceId, {
          lastSyncedAt: new Date().toISOString(),
        });
        await channel.send({ type: "sync-ack", ok: true, stats });
        done({ stats });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Merge failed";
        try {
          await channel.send({ type: "sync-ack", ok: false, error: message });
        } catch {
          // ignore
        }
        done({ error: message });
      }
    };

    channel.onMessage((message) => {
      void (async () => {
        try {
          const crypto = await ensureCrypto();
          if (message.type === "sync-bundle-chunk") {
            const part = await decryptChunk(
              crypto,
              message.iv,
              message.ciphertext,
            );
            chunkMap.set(part.index, part.chunk);
            expectedTotal = part.total;
          }
          if (message.type === "sync-complete") {
            expectedChecksum = message.checksum;
            await processComplete();
          }
          if (message.type === "sync-abort") {
            done({ error: message.message });
          }
        } catch (err) {
          done({
            error: err instanceof Error ? err.message : "Receive failed",
          });
        }
      })();
    });

    peer.setHandlers({
      onOpen: () => {
        void ensureCrypto().catch((err) =>
          done({
            error: err instanceof Error ? err.message : "Crypto setup failed",
          }),
        );
      },
      onMessage: (data) => channel.handleRawMessage(data),
      onError: (err) => done({ error: err.message }),
    });
  });
}