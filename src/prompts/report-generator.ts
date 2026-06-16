export function buildReportGeneratorPrompt(weekLabel: string): string {
  return `Generate a structured weekly reflection for ${weekLabel} using ONLY the stats and tasks in context.

Format as markdown with these sections:
## Summary
## Patterns noticed
## Planned vs Flow
## Category & tag highlights
## Gentle suggestions
## Reflection questions

Be warm and specific. Reference actual tags, categories, and percentages from context.`;
}