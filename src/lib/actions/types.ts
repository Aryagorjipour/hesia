export type HesiaActionType = "send_email" | "add_calendar_event";

export interface SendEmailAction {
  type: "send_email";
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface AddCalendarEventAction {
  type: "add_calendar_event";
  title: string;
  start: string;
  end: string;
  description?: string;
  timezone?: string;
  location?: string;
}

export type HesiaAction = SendEmailAction | AddCalendarEventAction;

export interface ActionContext {
  relayUrl?: string;
  relayEnabled?: boolean;
}

export interface ActionResult {
  ok: boolean;
  method?: "relay" | "mailto" | "ics_download" | "google_link" | "stub";
  message?: string;
  error?: string;
  /** Populated for calendar actions */
  icsContent?: string;
  googleCalendarUrl?: string;
}