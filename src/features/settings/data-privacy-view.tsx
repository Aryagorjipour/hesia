"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { FileArchive, FileJson, Lock, Trash2, Upload } from "lucide-react";
import { db } from "@/lib/db/schema";
import {
  downloadJsonExport,
  downloadZipExport,
  importExportBundle,
  readImportPayload,
  clearAllUserData,
  type ImportMode,
} from "@/lib/export/full-export";
import { isEncryptedExport } from "@/lib/crypto/export-vault";
import { confirm } from "@/lib/confirm";
import { toast } from "@/lib/toast";
import { NotificationsForm } from "./notifications-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DataPrivacyView() {
  const counts = useLiveQuery(async () => ({
    tasks: await db.tasks.count(),
    tags: await db.tags.count(),
    categories: await db.categories.count(),
    reports: await db.weeklyReports.count(),
    messages: await db.chatMessages.count(),
  }));

  const fileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [encryptExport, setEncryptExport] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [pendingImport, setPendingImport] = useState<unknown | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  function validateExportPassword(): string | undefined {
    if (!encryptExport) return undefined;
    if (exportPassword.length < 8) {
      throw new Error("Export password must be at least 8 characters");
    }
    if (exportPassword !== exportPasswordConfirm) {
      throw new Error("Export passwords do not match");
    }
    return exportPassword;
  }

  async function handleJsonExport() {
    setExporting(true);
    try {
      const password = validateExportPassword();
      await downloadJsonExport({ password });
      toast.success({
        title: "Export downloaded",
        description: password
          ? "Encrypted .hesia file saved to your downloads."
          : "JSON export saved to your downloads.",
      });
    } catch (e) {
      toast.error({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Export failed",
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleZipExport() {
    setExporting(true);
    try {
      const password = validateExportPassword();
      await downloadZipExport({ password });
      toast.success({
        title: "Export downloaded",
        description: password
          ? "Encrypted ZIP bundle saved to your downloads."
          : "ZIP bundle saved to your downloads.",
      });
    } catch (e) {
      toast.error({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Export failed",
      });
    } finally {
      setExporting(false);
    }
  }

  async function runImport(raw: unknown, password?: string) {
    const result = await importExportBundle(raw, importMode, password);
    toast.success({
      title: "Import complete",
      description: `Imported ${result.tasks} tasks, ${result.tags} tags, and ${result.categories} categories (${importMode}).`,
    });
  }

  async function handleImport(file: File) {
    setImporting(true);
    try {
      const raw = await readImportPayload(file);

      if (isEncryptedExport(raw)) {
        setPendingImport(raw);
        setImportPassword("");
        setPasswordDialogOpen(true);
        return;
      }

      await runImport(raw);
    } catch (e) {
      toast.error({
        title: "Import failed",
        description: e instanceof Error ? e.message : "Import failed",
      });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handlePasswordImport() {
    if (!pendingImport) return;
    setImporting(true);
    try {
      await runImport(pendingImport, importPassword);
      setPasswordDialogOpen(false);
      setPendingImport(null);
      setImportPassword("");
    } catch (e) {
      toast.error({
        title: "Import failed",
        description: e instanceof Error ? e.message : "Import failed",
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleClearAll() {
    const confirmed = await confirm({
      title: "Clear all user data?",
      description:
        "This permanently deletes all tasks, tags, categories, reports, chat, and memory. Settings are kept. This cannot be undone.",
      confirmLabel: "Clear all data",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await clearAllUserData();
      toast.success({
        title: "Data cleared",
        description: "All user data has been removed. Your settings are unchanged.",
      });
    } catch (e) {
      toast.error({
        title: "Could not clear data",
        description: e instanceof Error ? e.message : "Clear failed",
      });
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <NotificationsForm />

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <h2 className="text-sm font-medium text-foreground">Your data</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {counts?.tasks ?? 0} tasks · {counts?.tags ?? 0} tags ·{" "}
          {counts?.categories ?? 0} categories · {counts?.reports ?? 0} reports ·{" "}
          {counts?.messages ?? 0} chat messages — stored locally in your browser
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Exports include your profile, workspace configs, zen presets, and all
          app data.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground">Export</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Download everything for backup or sync. Optionally password-protect
          exports with AES-256 encryption.
        </p>

        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="encrypt-export" className="text-sm">
              Password-protect export
            </Label>
          </div>
          <Switch
            id="encrypt-export"
            checked={encryptExport}
            onCheckedChange={setEncryptExport}
          />
        </div>

        {encryptExport && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="export-password">Export password</Label>
              <Input
                id="export-password"
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-password-confirm">Confirm password</Label>
              <Input
                id="export-password-confirm"
                type="password"
                value={exportPasswordConfirm}
                onChange={(e) => setExportPasswordConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => void handleZipExport()}
            disabled={exporting}
          >
            <FileArchive className="h-4 w-4" />
            ZIP bundle
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => void handleJsonExport()}
            disabled={exporting}
          >
            <FileJson className="h-4 w-4" />
            {encryptExport ? ".hesia file" : "JSON only"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground">Import</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Restore from a ZIP bundle, <code className="text-[11px]">.json</code>,
          or password-protected <code className="text-[11px]">.hesia</code>{" "}
          (legacy <code className="text-[11px]">.aether</code> also supported){" "}
          file
        </p>
        <div className="mb-3 space-y-2">
          <Label>Mode</Label>
          <Select
            value={importMode}
            onValueChange={(v) => setImportMode(v as ImportMode)}
          >
            <SelectTrigger className="h-auto min-h-14 w-full max-w-lg items-start gap-3 py-3 text-left leading-snug [&_svg]:mt-1 [&_svg]:shrink-0 [&>span]:line-clamp-2 [&>span]:whitespace-normal [&>span]:pr-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-w-lg">
              <SelectItem
                value="merge"
                className="items-start whitespace-normal py-3 leading-snug"
              >
                Merge — add/update data, keep local settings
              </SelectItem>
              <SelectItem
                value="replace"
                className="items-start whitespace-normal py-3 leading-snug"
              >
                Replace — wipe then import (includes profile & workspace)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,.json,.hesia,.aether,application/zip,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
        >
          <Upload className="h-4 w-4" />
          {importing ? "Importing…" : "Choose file"}
        </Button>
      </div>

      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 sm:p-5">
        <h2 className="text-sm font-medium text-foreground">Danger zone</h2>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">
          Permanently delete all tasks, tags, categories, reports, chat, and
          memory. Profile, AI settings, and appearance are preserved.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-400"
          onClick={() => void handleClearAll()}
        >
          <Trash2 className="h-4 w-4" />
          Clear all data
        </Button>
      </div>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter export password</DialogTitle>
            <DialogDescription>
              This file is encrypted. Enter the password used when exporting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              placeholder="Export password"
              autoComplete="current-password"
            />
            <Button
              type="button"
              className="w-full"
              onClick={() => void handlePasswordImport()}
              disabled={importing || !importPassword}
            >
              {importing ? "Decrypting…" : "Decrypt and import"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}