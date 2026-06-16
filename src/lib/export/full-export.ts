import JSZip from "jszip";
import { format } from "date-fns";
import { db } from "@/lib/db/schema";
import { toISO } from "@/lib/utils/dates";
import {
  HesiaExportBundleSchema,
  type HesiaExportBundle,
} from "@/types/export";
import {
  decryptExportPayload,
  encryptExportPayload,
  isEncryptedExport,
} from "@/lib/crypto/export-vault";
import { reportToMarkdown } from "./report-export";
import { downloadFile } from "./report-export";

export async function collectExportBundle(): Promise<HesiaExportBundle> {
  const settings = await db.settings.get("default");
  if (!settings) throw new Error("Settings not found");

  return {
    version: settings.version ?? "0.1.0",
    exportedAt: toISO(new Date()),
    tasks: await db.tasks.toArray(),
    tags: await db.tags.toArray(),
    categories: await db.categories.toArray(),
    weeklyReports: await db.weeklyReports.toArray(),
    chatSessions: await db.chatSessions.toArray(),
    chatMessages: await db.chatMessages.toArray(),
    userMemory: await db.userMemory.toArray(),
    settings,
  };
}

export interface ExportOptions {
  password?: string;
}

async function serializeBundle(bundle: HesiaExportBundle): Promise<string> {
  return JSON.stringify(bundle, null, 2);
}

const ZIP_DATA_FILES = [
  "hesia-data.json",
  "hesia-data.hesia",
  "aether-data.json",
  "aether-data.aether",
] as const;

export async function readImportPayload(file: File): Promise<unknown> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".zip") || file.type === "application/zip") {
    const zip = await JSZip.loadAsync(file);
    for (const dataFile of ZIP_DATA_FILES) {
      const entry = zip.file(dataFile);
      if (entry) {
        const text = await entry.async("text");
        return JSON.parse(text) as unknown;
      }
    }
    throw new Error(
      "ZIP bundle must contain hesia-data.json or hesia-data.hesia",
    );
  }

  const text = await file.text();
  return JSON.parse(text) as unknown;
}

export async function parseImportFile(
  raw: unknown,
  password?: string,
): Promise<HesiaExportBundle> {
  if (isEncryptedExport(raw)) {
    if (!password?.trim()) {
      throw new Error("This export is password-protected");
    }
    const plaintext = await decryptExportPayload(raw, password.trim());
    const parsed = JSON.parse(plaintext) as unknown;
    const result = HesiaExportBundleSchema.safeParse(parsed);
    if (!result.success) throw new Error("Invalid Hesia export file");
    return result.data;
  }

  const result = HesiaExportBundleSchema.safeParse(raw);
  if (!result.success) throw new Error("Invalid Hesia export file");
  return result.data;
}

export async function downloadJsonExport(
  options: ExportOptions = {},
): Promise<void> {
  const bundle = await collectExportBundle();
  const label = format(new Date(), "yyyy-MM-dd");
  const json = await serializeBundle(bundle);

  if (options.password?.trim()) {
    const encrypted = await encryptExportPayload(json, options.password.trim());
    downloadFile(
      `hesia-export-${label}.hesia`,
      JSON.stringify(encrypted, null, 2),
      "application/json;charset=utf-8",
    );
    return;
  }

  downloadFile(
    `hesia-export-${label}.json`,
    json,
    "application/json;charset=utf-8",
  );
}

export async function downloadZipExport(
  options: ExportOptions = {},
): Promise<void> {
  const bundle = await collectExportBundle();
  const zip = new JSZip();
  const json = await serializeBundle(bundle);
  const label = format(new Date(), "yyyy-MM-dd");

  if (options.password?.trim()) {
    const encrypted = await encryptExportPayload(json, options.password.trim());
    zip.file("hesia-data.hesia", JSON.stringify(encrypted, null, 2));
    zip.file(
      "README.txt",
      [
        "Hesia encrypted export bundle",
        `Exported: ${bundle.exportedAt}`,
        "",
        "hesia-data.hesia — password-protected restore file",
        "Import in Settings → Data & Privacy (enter password when prompted)",
        "reports/ — markdown reflections (unencrypted in this bundle)",
      ].join("\n"),
    );
  } else {
    zip.file("hesia-data.json", json);
    zip.file(
      "README.txt",
      [
        "Hesia export bundle",
        `Exported: ${bundle.exportedAt}`,
        "",
        "hesia-data.json — full restore file for Import in Settings → Data",
        "reports/ — markdown reflections per week",
      ].join("\n"),
    );
  }

  const reportsFolder = zip.folder("reports");
  for (const report of bundle.weeklyReports) {
    if (report.aiNarrative) {
      reportsFolder?.file(
        `report-${report.weekStart}.md`,
        reportToMarkdown(report),
      );
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `hesia-export-${label}.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type ImportMode = "merge" | "replace";

export async function importExportBundle(
  raw: unknown,
  mode: ImportMode = "merge",
  password?: string,
): Promise<{ tasks: number; tags: number; categories: number }> {
  const bundle = await parseImportFile(raw, password);

  const userDataTablesForImport = [
    db.tasks,
    db.tags,
    db.categories,
    db.weeklyReports,
    db.chatSessions,
    db.chatMessages,
    db.userMemory,
  ] as const;

  if (mode === "replace") {
    await db.transaction(
      "rw",
      [...userDataTablesForImport, db.settings],
      async () => {
        await Promise.all([
          db.tasks.clear(),
          db.tags.clear(),
          db.categories.clear(),
          db.weeklyReports.clear(),
          db.chatSessions.clear(),
          db.chatMessages.clear(),
          db.userMemory.clear(),
        ]);
        await db.tasks.bulkPut(bundle.tasks);
        await db.tags.bulkPut(bundle.tags);
        await db.categories.bulkPut(bundle.categories);
        await db.weeklyReports.bulkPut(bundle.weeklyReports);
        await db.chatSessions.bulkPut(bundle.chatSessions);
        await db.chatMessages.bulkPut(bundle.chatMessages);
        await db.userMemory.bulkPut(bundle.userMemory);
        await db.settings.put({ ...bundle.settings, id: "default" });
      },
    );
  } else {
    await db.transaction("rw", userDataTablesForImport, async () => {
      await db.tasks.bulkPut(bundle.tasks);
      await db.tags.bulkPut(bundle.tags);
      await db.categories.bulkPut(bundle.categories);
      await db.weeklyReports.bulkPut(bundle.weeklyReports);
      await db.chatSessions.bulkPut(bundle.chatSessions);
      await db.chatMessages.bulkPut(bundle.chatMessages);
      await db.userMemory.bulkPut(bundle.userMemory);
    });
  }

  return {
    tasks: bundle.tasks.length,
    tags: bundle.tags.length,
    categories: bundle.categories.length,
  };
}

const userDataTables = [
  db.tasks,
  db.tags,
  db.categories,
  db.weeklyReports,
  db.chatSessions,
  db.chatMessages,
  db.userMemory,
] as const;

export async function clearAllUserData(): Promise<void> {
  await db.transaction("rw", userDataTables, async () => {
    await Promise.all([
      db.tasks.clear(),
      db.tags.clear(),
      db.categories.clear(),
      db.weeklyReports.clear(),
      db.chatSessions.clear(),
      db.chatMessages.clear(),
      db.userMemory.clear(),
    ]);
  });
}