/** Zero-width non-joiner — standard Persian typography separator. */
export const ZWNJ = "\u200c";

/** Join Persian fragments with ZWNJ instead of a regular space. */
export function joinWithZwnj(...parts: string[]): string {
  return parts.filter(Boolean).join(ZWNJ);
}

const PERSIAN_PAIR =
  /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+)\s+([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+)/g;

/**
 * Insert ZWNJ between adjacent Persian words separated by a space.
 * Latin and numeric segments are left unchanged.
 */
export function applyZwnj(text: string): string {
  if (!text) return text;
  return text.replace(PERSIAN_PAIR, `$1${ZWNJ}$2`);
}