export interface GoogleCalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
}

function toGoogleUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/**
 * Build a Google Calendar "add event" URL using UTC/Gregorian timestamps.
 * @see https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs
 */
export function buildGoogleCalendarUrl(
  event: GoogleCalendarEventInput,
): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toGoogleUtc(event.start)}/${toGoogleUtc(event.end)}`,
  });

  if (event.description?.trim()) {
    params.set("details", event.description.trim());
  }
  if (event.location?.trim()) {
    params.set("location", event.location.trim());
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function openGoogleCalendar(event: GoogleCalendarEventInput): void {
  window.open(buildGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
}