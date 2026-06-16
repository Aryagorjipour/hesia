import { toISO } from "@/lib/utils/dates";

export function syncNow(): string {
  return toISO(new Date());
}