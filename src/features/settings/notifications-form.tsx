"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Bell } from "lucide-react";
import { db } from "@/lib/db/schema";
import { requestNotificationPermission } from "@/lib/notifications/reflection-reminder";
import { toast } from "@/lib/toast";
import type { AppSettings } from "@/types/settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${i.toString().padStart(2, "0")}:00`,
}));

export function NotificationsForm() {
  const settings = useLiveQuery(() => db.settings.get("default"));
  const notifications = settings?.notifications ?? {
    weeklyReflection: false,
    reflectionDay: 0,
    reflectionHour: 18,
  };

  const [saving, setSaving] = useState(false);

  async function persist(patch: Partial<AppSettings["notifications"]>) {
    if (!settings) return;
    setSaving(true);
    try {
      await db.settings.put({
        ...settings,
        notifications: { ...notifications, ...patch },
      });
      if ("weeklyReflection" in patch) {
        toast.info({
          title: patch.weeklyReflection
            ? "Reminder enabled"
            : "Reminder disabled",
          description: patch.weeklyReflection
            ? "You'll get a browser nudge to review your week."
            : "Weekly reflection reminders are turned off.",
        });
      }
    } catch (e) {
      toast.error({
        title: "Could not update notifications",
        description: e instanceof Error ? e.message : "Update failed",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleEnableNotifications() {
    const perm = await requestNotificationPermission();
    if (perm === "granted") {
      toast.success({
        title: "Notifications enabled",
        description: "Browser notifications are allowed for this app.",
      });
    } else if (perm === "denied") {
      toast.warning({
        title: "Notifications blocked",
        description: "Enable notifications in your browser settings to use reminders.",
      });
    } else {
      toast.info({
        title: "Permission pending",
        description: `Notification permission: ${perm}`,
      });
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-medium text-foreground">Notifications</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Weekly reflection reminder</Label>
            <p className="text-xs text-muted-foreground">
              Browser notification to review your week
            </p>
          </div>
          <Switch
            checked={notifications.weeklyReflection}
            onCheckedChange={(v) => void persist({ weeklyReflection: v })}
            disabled={saving}
          />
        </div>

        {notifications.weeklyReflection && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select
                value={String(notifications.reflectionDay)}
                onValueChange={(v) =>
                  void persist({ reflectionDay: parseInt(v, 10) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hour</Label>
              <Select
                value={String(notifications.reflectionHour)}
                onValueChange={(v) =>
                  void persist({ reflectionHour: parseInt(v, 10) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((h) => (
                    <SelectItem key={h.value} value={h.value}>
                      {h.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void handleEnableNotifications()}
        >
          Enable browser notifications
        </Button>
      </div>
    </div>
  );
}