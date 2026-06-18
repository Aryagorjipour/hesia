export interface IcsEventInput {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  /** IANA timezone for TZID fields (e.g. Asia/Tehran). Omit for UTC Zulu stamps. */
  timezone?: string;
  createdAt?: Date;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format as UTC Zulu: YYYYMMDDTHHMMSSZ */
export function formatIcsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Format local wall-clock in a TZID block: YYYYMMDDTHHMMSS */
export function formatIcsLocal(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/** Fold long lines per RFC 5545 (75 octets, CRLF + space continuation). */
export function foldIcsLine(line: string): string {
  const max = 75;
  if (line.length <= max) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, max));
  remaining = remaining.slice(max);
  while (remaining.length > 0) {
    parts.push(` ${remaining.slice(0, max - 1)}`);
    remaining = remaining.slice(max - 1);
  }
  return parts.join("\r\n");
}

function buildProperty(name: string, value: string, params?: string): string {
  const prop = params ? `${name};${params}` : name;
  return foldIcsLine(`${prop}:${escapeIcsText(value)}`);
}

/**
 * Build a single VEVENT block. Uses TZID when timezone is provided,
 * otherwise emits UTC/Gregorian Zulu timestamps.
 */
export function buildVevent(event: IcsEventInput): string {
  const lines: string[] = ["BEGIN:VEVENT"];
  const stamp = formatIcsUtc(event.createdAt ?? new Date());

  lines.push(foldIcsLine(`UID:${event.uid}`));
  lines.push(foldIcsLine(`DTSTAMP:${stamp}`));
  lines.push(buildProperty("SUMMARY", event.title));

  if (event.description?.trim()) {
    lines.push(buildProperty("DESCRIPTION", event.description.trim()));
  }
  if (event.location?.trim()) {
    lines.push(buildProperty("LOCATION", event.location.trim()));
  }

  if (event.timezone) {
    const tz = event.timezone;
    lines.push(
      foldIcsLine(`DTSTART;TZID=${tz}:${formatIcsLocal(event.start)}`),
    );
    lines.push(foldIcsLine(`DTEND;TZID=${tz}:${formatIcsLocal(event.end)}`));
  } else {
    lines.push(foldIcsLine(`DTSTART:${formatIcsUtc(event.start)}`));
    lines.push(foldIcsLine(`DTEND:${formatIcsUtc(event.end)}`));
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function buildIcsCalendar(events: IcsEventInput[]): string {
  const body = events.map((e) => buildVevent(e)).join("\r\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hesia//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    body,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcsFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}