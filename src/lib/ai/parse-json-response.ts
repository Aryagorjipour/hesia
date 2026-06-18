import type { z } from "zod";

export function parseAiJsonResponse<T>(
  raw: string,
  schema: z.ZodType<T>,
  invalidMessage = "AI returned an invalid response",
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI did not return valid JSON");
    parsed = JSON.parse(match[0]);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(invalidMessage);
  }
  return result.data;
}