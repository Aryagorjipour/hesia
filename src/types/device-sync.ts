import { z } from "zod";

export const SyncTombstoneSchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum(["task", "tag", "category"]),
  entityKey: z.string(),
  deletedAt: z.string().datetime(),
});

export type SyncTombstone = z.infer<typeof SyncTombstoneSchema>;

export const DeviceSyncSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  passwordVerifier: z
    .object({
      salt: z.string(),
      hash: z.string(),
    })
    .optional(),
  deviceLabel: z.string().max(32).optional(),
  deviceId: z.string().min(8).max(36).optional(),
  lastRelayUrl: z.string().max(120).optional(),
  trustedDeviceIds: z.array(z.string()).max(20).optional(),
});

export type DeviceSyncSettings = z.infer<typeof DeviceSyncSettingsSchema>;

export const RelayPeerSchema = z.object({
  deviceId: z.string(),
  label: z.string(),
});

export type RelayPeer = z.infer<typeof RelayPeerSchema>;

export const RelaySignalKindSchema = z.enum([
  "sync-request",
  "sync-accept",
  "sync-reject",
  "offer",
  "answer",
  "ice",
]);

export type RelaySignalKind = z.infer<typeof RelaySignalKindSchema>;

export const SyncChannelMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("sync-bundle-chunk"),
    index: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    iv: z.string(),
    ciphertext: z.string(),
  }),
  z.object({
    type: z.literal("sync-complete"),
    exportedAt: z.string().datetime(),
    checksum: z.string(),
  }),
  z.object({
    type: z.literal("sync-ack"),
    ok: z.boolean(),
    stats: z
      .object({
        updated: z.number(),
        skipped: z.number(),
        deleted: z.number(),
      })
      .optional(),
    error: z.string().optional(),
  }),
  z.object({
    type: z.literal("sync-abort"),
    message: z.string(),
  }),
]);

export type SyncChannelMessage = z.infer<typeof SyncChannelMessageSchema>;

export interface SyncRequestPayload {
  sessionId: string;
  preview: { tasks: number; tags: number; categories: number };
}

export interface SyncAcceptPayload {
  sessionId: string;
}

export interface SyncRejectPayload {
  sessionId: string;
  reason?: string;
}

export interface WebRtcSdpPayload {
  sdp: string;
}

export interface WebRtcIcePayload {
  candidate: RTCIceCandidateInit | null;
}

export interface TransferProgress {
  phase: "connecting" | "transferring" | "merging" | "done" | "error";
  bytesSent?: number;
  bytesTotal?: number;
  chunkIndex?: number;
  chunkTotal?: number;
  message?: string;
}

export interface MergeStats {
  updated: number;
  skipped: number;
  deleted: number;
}