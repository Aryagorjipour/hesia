import { v4 as uuidv4 } from "uuid";
import { parseISO } from "date-fns";
import {
  buildGoogleCalendarUrl,
  type GoogleCalendarEventInput,
} from "@/lib/calendar/google-calendar-link";
import {
  buildIcsCalendar,
  downloadIcsFile,
} from "@/lib/calendar/ics-builder";
import { buildMailtoUrl, draftReportEmail } from "@/lib/email/draft-report-email";
import { sendEmailViaRelay } from "@/lib/email/relay-client";
import type {
  ActionContext,
  ActionResult,
  AddCalendarEventAction,
  HesiaAction,
  SendEmailAction,
} from "./types";
import type { WeeklyReport } from "@/types/report";
import type { LocaleSettings } from "@/types/settings";

export async function executeSendEmail(
  action: SendEmailAction,
  ctx: ActionContext = {},
): Promise<ActionResult> {
  if (ctx.relayEnabled && ctx.relayUrl) {
    const result = await sendEmailViaRelay(ctx.relayUrl, {
      to: action.to,
      subject: action.subject,
      text: action.body,
      html: action.html,
    });
    if (result.ok) {
      return {
        ok: true,
        method: "relay",
        message: result.messageId
          ? `Sent (id: ${result.messageId})`
          : "Email sent via relay",
      };
    }
  }

  const mailto = buildMailtoUrl(action.to, {
    subject: action.subject,
    text: action.body,
    html: action.html ?? "",
  });

  if (typeof window !== "undefined") {
    window.location.href = mailto;
  }

  return {
    ok: true,
    method: "mailto",
    message: "Opened mailto fallback — complete send in your mail client",
  };
}

export async function executeAddCalendarEvent(
  action: AddCalendarEventAction,
): Promise<ActionResult> {
  const start = parseISO(action.start);
  const end = parseISO(action.end);
  const timezone = action.timezone;

  const googleInput: GoogleCalendarEventInput = {
    title: action.title,
    description: action.description,
    location: action.location,
    start,
    end,
  };

  const icsContent = buildIcsCalendar([
    {
      uid: `${uuidv4()}@hesia.local`,
      title: action.title,
      description: action.description,
      location: action.location,
      start,
      end,
      timezone,
    },
  ]);

  return {
    ok: true,
    method: timezone ? "ics_download" : "google_link",
    icsContent,
    googleCalendarUrl: buildGoogleCalendarUrl(googleInput),
    message: "Calendar event prepared",
  };
}

/** Central executor — M4 AI actions call into these stubs. */
export async function executeAction(
  action: HesiaAction,
  ctx: ActionContext = {},
): Promise<ActionResult> {
  switch (action.type) {
    case "send_email":
      return executeSendEmail(action, ctx);
    case "add_calendar_event":
      return executeAddCalendarEvent(action);
    default: {
      const _exhaustive: never = action;
      return { ok: false, error: `Unknown action: ${(_exhaustive as HesiaAction).type}` };
    }
  }
}

export async function sendWeeklyReportEmail(
  report: WeeklyReport,
  to: string,
  options: {
    locale?: Pick<LocaleSettings, "calendar">;
    workspaceName?: string;
    relayUrl?: string;
    relayEnabled?: boolean;
  } = {},
): Promise<ActionResult> {
  const draft = draftReportEmail(
    report,
    options.locale,
    options.workspaceName,
  );
  return executeSendEmail(
    {
      type: "send_email",
      to,
      subject: draft.subject,
      body: draft.text,
      html: draft.html,
    },
    {
      relayUrl: options.relayUrl,
      relayEnabled: options.relayEnabled,
    },
  );
}

export function downloadCalendarEventIcs(
  action: AddCalendarEventAction,
  filename?: string,
): void {
  void executeAddCalendarEvent(action).then((result) => {
    if (result.icsContent) {
      downloadIcsFile(
        filename ?? `hesia-event-${action.start.slice(0, 10)}.ics`,
        result.icsContent,
      );
    }
  });
}