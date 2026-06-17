import { z } from "zod";

export const CompactSignalSchema = z.object({
  ufrag: z.string().min(4).max(32),
  pwd: z.string().min(22).max(64),
  fingerprint: z.string().min(64).max(64),
  setup: z.enum(["actpass", "active", "passive"]),
  candidates: z.array(z.string()).max(12),
});

export type CompactSignal = z.infer<typeof CompactSignalSchema>;

export type SdpRole = "offer" | "answer";

const MAX_HOST_UDP = 8;
const MAX_SRFLX_UDP = 2;
const MAX_RELAY_UDP = 2;
const MAX_PRFLX_UDP = 2;

interface ParsedCandidate {
  line: string;
  type: "host" | "srflx" | "relay" | "prflx" | "other";
  protocol: "udp" | "tcp" | "other";
  priority: number;
}

function normalizeFingerprint(value: string): string {
  return value.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
}

function formatFingerprint(hex: string): string {
  return hex
    .match(/.{1,2}/g)!
    .map((pair) => pair.toUpperCase())
    .join(":");
}

function parseCandidateLine(line: string): ParsedCandidate | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("a=candidate:")) return null;

  const body = trimmed.slice("a=candidate:".length);
  const parts = body.split(" ");
  if (parts.length < 8) return null;

  const protocol = parts[2]?.toLowerCase();
  const type = parts[7]?.toLowerCase();
  const priority = Number(parts[3] ?? 0);

  return {
    line: body,
    protocol: protocol === "udp" ? "udp" : protocol === "tcp" ? "tcp" : "other",
    type:
      type === "host" ||
      type === "srflx" ||
      type === "relay" ||
      type === "prflx"
        ? type
        : "other",
    priority: Number.isFinite(priority) ? priority : 0,
  };
}

function hostCandidateScore(line: string): number {
  const parsed = parseCandidateLine(`a=candidate:${line}`);
  if (!parsed) return 0;
  let score = parsed.priority;
  if (parsed.line.includes(".local")) score -= 1_000_000;
  if (/\s(?:10|172\.(?:1[6-9]|2\d|3[01])|192\.168)\./.test(parsed.line)) {
    score += 100_000;
  }
  return score;
}

function filterCandidates(lines: string[], includeRelay = false): string[] {
  const parsed = lines
    .map(parseCandidateLine)
    .filter((c): c is ParsedCandidate => c !== null)
    .filter((c) => c.protocol === "udp");

  const hosts = parsed
    .filter((c) => c.type === "host")
    .sort((a, b) => hostCandidateScore(b.line) - hostCandidateScore(a.line))
    .slice(0, MAX_HOST_UDP);

  const srflx = parsed
    .filter((c) => c.type === "srflx")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_SRFLX_UDP);

  const relay = includeRelay
    ? parsed
        .filter((c) => c.type === "relay")
        .sort((a, b) => b.priority - a.priority)
        .slice(0, MAX_RELAY_UDP)
    : [];

  const prflx = parsed
    .filter((c) => c.type === "prflx")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_PRFLX_UDP);

  const selected = new Set(
    [...hosts, ...srflx, ...prflx, ...relay].map((c) => c.line),
  );
  return lines
    .map((line) => parseCandidateLine(line)?.line)
    .filter((line): line is string => Boolean(line && selected.has(line)));
}

function readSdpField(sdp: string, prefix: string): string | undefined {
  for (const line of sdp.split(/\r?\n/)) {
    if (line.startsWith(prefix)) return line.slice(prefix.length);
  }
  return undefined;
}

export function extractCompactSignal(
  sdp: string,
  role: SdpRole,
  options?: { includeRelay?: boolean },
): CompactSignal {
  const ufrag = readSdpField(sdp, "a=ice-ufrag:");
  const pwd = readSdpField(sdp, "a=ice-pwd:");
  const fingerprintRaw = readSdpField(sdp, "a=fingerprint:sha-256 ");
  const setupRaw = readSdpField(sdp, "a=setup:");

  if (!ufrag || !pwd || !fingerprintRaw) {
    throw new Error("SDP missing required ICE or fingerprint fields");
  }

  const fingerprint = normalizeFingerprint(fingerprintRaw);
  if (fingerprint.length !== 64) {
    throw new Error("Invalid DTLS fingerprint in SDP");
  }

  const setup =
    setupRaw === "active" || setupRaw === "passive" || setupRaw === "actpass"
      ? setupRaw
      : role === "offer"
        ? "actpass"
        : "active";

  const candidateLines = sdp
    .split(/\r?\n/)
    .filter((line) => line.startsWith("a=candidate:"));

  return CompactSignalSchema.parse({
    ufrag,
    pwd,
    fingerprint,
    setup,
    candidates: filterCandidates(candidateLines, options?.includeRelay),
  });
}

export function rebuildSdp(signal: CompactSignal, role: SdpRole): string {
  const parsed = CompactSignalSchema.parse(signal);
  const setup =
    role === "offer" && parsed.setup === "active"
      ? "actpass"
      : parsed.setup;

  const lines = [
    "v=0",
    "o=- 0 2 IN IP4 127.0.0.1",
    "s=-",
    "t=0 0",
    "a=group:BUNDLE 0",
    "a=extmap-allow-mixed",
    "a=msid-semantic: WMS",
    "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
    "c=IN IP4 0.0.0.0",
    `a=ice-ufrag:${parsed.ufrag}`,
    `a=ice-pwd:${parsed.pwd}`,
    "a=ice-options:trickle",
    `a=fingerprint:sha-256 ${formatFingerprint(parsed.fingerprint)}`,
    `a=setup:${setup}`,
    "a=mid:0",
    "a=sctp-port:5000",
    "a=max-message-size:262144",
    ...parsed.candidates.map((candidate) => `a=candidate:${candidate}`),
  ];

  return `${lines.join("\r\n")}\r\n`;
}

export function compactSignalFingerprint(signal: CompactSignal): string {
  const parsed = CompactSignalSchema.parse(signal);
  const candidates = [...parsed.candidates].sort().join("|");
  return [
    `ufrag=${parsed.ufrag}`,
    `pwd=${parsed.pwd}`,
    `fp=${parsed.fingerprint}`,
    `setup=${parsed.setup}`,
    `candidates=${candidates}`,
  ].join("&");
}

export function mergeCandidateSignals(
  base: CompactSignal,
  extraCandidates: string[],
): CompactSignal {
  const merged = new Set(base.candidates);
  for (const line of extraCandidates) {
    const parsed = parseCandidateLine(
      line.startsWith("a=candidate:") ? line : `a=candidate:${line}`,
    );
    if (parsed && parsed.protocol === "udp" && parsed.type !== "relay") {
      merged.add(parsed.line);
    }
  }

  return CompactSignalSchema.parse({
    ...base,
    candidates: filterCandidates(
      [...merged].map((candidate) => `a=candidate:${candidate}`),
    ),
  });
}

export function extractExtraCandidates(sdp: string): string[] {
  return sdp
    .split(/\r?\n/)
    .filter((line) => line.startsWith("a=candidate:"))
    .map((line) => line.slice("a=candidate:".length));
}