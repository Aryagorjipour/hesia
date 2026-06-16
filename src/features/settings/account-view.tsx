"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { User } from "lucide-react";
import { db } from "@/lib/db/schema";
import type { Profile } from "@/types/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ProfileForm({
  initialProfile,
  onSaved,
}: {
  initialProfile: Profile;
  onSaved: (message: string) => void;
}) {
  const [username, setUsername] = useState(initialProfile.username ?? "");
  const [workspaceName, setWorkspaceName] = useState(
    initialProfile.workspaceName ?? "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const next: Profile = {
        username: username.trim() || undefined,
        workspaceName: workspaceName.trim() || undefined,
      };
      await db.settings.update("default", { profile: next });
      onSaved("Profile saved");
    } finally {
      setSaving(false);
    }
  }

  const displayName = username.trim() || "there";
  const workspace = workspaceName.trim() || "My Workspace";

  return (
    <>
      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15">
            <User className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Preview</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hi {displayName} — welcome to{" "}
              <span className="text-foreground">{workspace}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-medium text-foreground">Your profile</h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={40}
            />
            <p className="text-[11px] text-muted-foreground">
              Shown in greetings across the app and shared with your AI companion.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. Morning Rhythm"
              maxLength={60}
            />
            <p className="text-[11px] text-muted-foreground">
              Names your personal space in the sidebar and board header.
            </p>
          </div>

          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>
    </>
  );
}

export function AccountView() {
  const settings = useLiveQuery(() => db.settings.get("default"));
  const profile = settings?.profile ?? {};
  const [message, setMessage] = useState<string | null>(null);
  const formKey = `${profile.username ?? ""}|${profile.workspaceName ?? ""}`;

  return (
    <div className="space-y-6 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <ProfileForm
        key={formKey}
        initialProfile={profile}
        onSaved={setMessage}
      />

      {message && (
        <p className="rounded-xl bg-accent/10 px-3 py-2 text-xs text-accent">
          {message}
        </p>
      )}
    </div>
  );
}