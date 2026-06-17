import { z } from "zod";
import { CompactSignalSchema } from "@/lib/p2p/sdp-compact";

export const P2P_PACKET_VERSION = 2;
export const P2P_SESSION_TTL_MS = 15 * 60 * 1000;
export const P2P_MAX_ENCODED_CHARS = 1800;

export const JsonWebKeySchema = z.custom<JsonWebKey>(
  (value) => typeof value === "object" && value !== null,
);

export const OfferPacketSchema = z.object({
  v: z.literal(P2P_PACKET_VERSION),
  type: z.literal("offer"),
  sessionId: z.string().uuid(),
  deviceId: z.string().min(8).max(16),
  publicKeyJwk: JsonWebKeySchema,
  deviceLabel: z.string().max(32),
  signal: CompactSignalSchema,
  expiresAt: z.string().datetime(),
  signature: z.string(),
  ephemeralPublicKeyJwk: JsonWebKeySchema.optional(),
  preview: z
    .object({
      tasks: z.number().int().nonnegative(),
      tags: z.number().int().nonnegative(),
      categories: z.number().int().nonnegative(),
    })
    .optional(),
});

export type OfferPacket = z.infer<typeof OfferPacketSchema>;

export const AnswerPacketSchema = z.object({
  v: z.literal(P2P_PACKET_VERSION),
  type: z.literal("answer"),
  sessionId: z.string().uuid(),
  deviceId: z.string().min(8).max(16),
  publicKeyJwk: JsonWebKeySchema,
  signal: CompactSignalSchema,
  expiresAt: z.string().datetime(),
  signature: z.string(),
  trustLevel: z.enum(["trusted", "password"]),
  ephemeralPublicKeyJwk: JsonWebKeySchema.optional(),
});

export type AnswerPacket = z.infer<typeof AnswerPacketSchema>;

export const IcePatchPacketSchema = z.object({
  v: z.literal(P2P_PACKET_VERSION),
  type: z.literal("ice-patch"),
  sessionId: z.string().uuid(),
  deviceId: z.string().min(8).max(16),
  candidates: z.array(z.string()).max(12),
  expiresAt: z.string().datetime(),
});

export type IcePatchPacket = z.infer<typeof IcePatchPacketSchema>;

export const SyncChannelMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("sync-request"),
    exportedAt: z.string().datetime(),
    preview: z.object({
      tasks: z.number().int().nonnegative(),
      tags: z.number().int().nonnegative(),
      categories: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    type: z.literal("sync-bundle-chunk"),
    index: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    ciphertext: z.string(),
    iv: z.string(),
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
        updated: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
        deleted: z.number().int().nonnegative(),
      })
      .optional(),
    error: z.string().optional(),
  }),
  z.object({
    type: z.literal("sync-abort"),
    code: z.string(),
    message: z.string(),
  }),
]);

export type SyncChannelMessage = z.infer<typeof SyncChannelMessageSchema>;

export const TrustedSenderSchema = z.object({
  deviceId: z.string(),
  publicKeyJwk: JsonWebKeySchema,
  label: z.string().max(32),
  trustedAt: z.string().datetime(),
  lastSyncedAt: z.string().datetime().optional(),
});

export type TrustedSender = z.infer<typeof TrustedSenderSchema>;

export const DeviceIdentityRecordSchema = z.object({
  id: z.literal("local"),
  deviceId: z.string(),
  publicKeyJwk: JsonWebKeySchema,
  encryptedPrivateKey: z.string(),
  createdAt: z.string().datetime(),
});

export type DeviceIdentityRecord = z.infer<typeof DeviceIdentityRecordSchema>;

export const SyncTombstoneSchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum(["task", "tag", "category"]),
  entityKey: z.string(),
  deletedAt: z.string().datetime(),
});

export type SyncTombstone = z.infer<typeof SyncTombstoneSchema>;

export const P2pSyncSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  passwordVerifier: z
    .object({
      salt: z.string(),
      hash: z.string(),
    })
    .optional(),
  deviceLabel: z.string().max(32).optional(),
  usePublicTurn: z.boolean().default(false),
  turnUrls: z.string().max(240).optional(),
  turnUsername: z.string().max(80).optional(),
  turnCredential: z.string().max(80).optional(),
});

export type P2pSyncSettings = z.infer<typeof P2pSyncSettingsSchema>;