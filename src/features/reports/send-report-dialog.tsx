"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CalendarPlus, Loader2, Mail, Send } from "lucide-react";
import type { WeeklyReport } from "@/types/report";
import { db } from "@/lib/db/schema";
import {
  downloadCalendarEventIcs,
  sendWeeklyReportEmail,
} from "@/lib/actions/action-executor";
import { openGoogleCalendar } from "@/lib/calendar/google-calendar-link";
import { useLocaleSettings } from "@/lib/hooks/use-locale-settings";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SendReportDialogProps {
  report: WeeklyReport;
  disabled?: boolean;
}

export function SendReportDialog({ report, disabled }: SendReportDialogProps) {
  const settings = useLiveQuery(() => db.settings.get("default"));
  const locale = useLocaleSettings();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const relay = settings?.relay;
  const workspaceName = settings?.profile?.workspaceName ?? "Hesia";

  async function handleSend() {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.warning({
        title: "Email required",
        description: "Enter a recipient address or use calendar actions below.",
      });
      return;
    }

    setSending(true);
    try {
      const result = await sendWeeklyReportEmail(report, trimmed, {
        locale,
        workspaceName,
        relayUrl: relay?.url,
        relayEnabled: relay?.enabled,
      });

      if (result.ok) {
        toast.success({
          title: result.method === "relay" ? "Email sent" : "Mail client opened",
          description: result.message ?? "Done",
        });
        if (result.method === "relay") setOpen(false);
      } else {
        toast.error({
          title: "Could not send",
          description: result.error ?? "Send failed",
        });
      }
    } finally {
      setSending(false);
    }
  }

  function handleAddCalendarReminder() {
    const reflection = settings?.notifications;
    const start = new Date();
    start.setDate(
      start.getDate() +
        ((reflection?.reflectionDay ?? 0) - start.getDay() + 7) % 7,
    );
    start.setHours(reflection?.reflectionHour ?? 18, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    openGoogleCalendar({
      title: `${workspaceName} weekly reflection`,
      description: "Review your Hesia weekly report and notes.",
      start,
      end,
    });
  }

  function handleDownloadIcs() {
    const reflection = settings?.notifications;
    const start = new Date();
    start.setDate(
      start.getDate() +
        ((reflection?.reflectionDay ?? 0) - start.getDay() + 7) % 7,
    );
    start.setHours(reflection?.reflectionHour ?? 18, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    downloadCalendarEventIcs(
      {
        type: "add_calendar_event",
        title: `${workspaceName} weekly reflection`,
        description: "Review your Hesia weekly report and notes.",
        start: start.toISOString(),
        end: end.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      `hesia-reflection-${report.weekStart}.ics`,
    );

    toast.success({
      title: "Calendar file downloaded",
      description: "Import the .ics file into your calendar app.",
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5"
          disabled={disabled}
        >
          <Send className="h-3.5 w-3.5" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share weekly reflection</DialogTitle>
          <DialogDescription>
            Send through your email (via Hesia Companion) or your mail app.
            Add a calendar reminder for your next reflection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-email">Recipient email</Label>
            <Input
              id="report-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <p className="text-xs text-muted-foreground">
              {relay?.enabled
                ? "Uses your email account set up in Settings → Integrations."
                : "Opens your mail app instead — enable Companion in Settings to send in-app."}
            </p>
          </div>

          <Button
            className="w-full gap-2"
            onClick={() => void handleSend()}
            disabled={sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {relay?.enabled ? "Send email" : "Open in mail client"}
          </Button>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <p className="mb-2 text-xs font-medium text-foreground">
              Calendar reminder
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={handleAddCalendarReminder}
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Google Calendar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={handleDownloadIcs}
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Download .ics
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}