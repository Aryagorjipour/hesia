export const TASK_CREATOR_PROMPT = `Extract a task from the user's message. Respond with ONLY valid JSON:
{
  "title": "string",
  "description": "optional string",
  "isPlanned": boolean,
  "status": "inbox"|"todo"|"doing"|"done",
  "tags": ["string"],
  "category": "optional string",
  "durationMinutes": optional number
}`;