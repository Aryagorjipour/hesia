/**
 * Gentle 0–100 score: rewards planned completion without punishing flow wins.
 * 60% planned completion rate + 40% overall completion, capped and smoothed.
 */
export function computeCalmFocusScore(
  plannedCount: number,
  unplannedCount: number,
  completedTasks: number,
  totalTasks: number,
): number {
  if (totalTasks === 0) return 0;

  const plannedCompleted = Math.min(plannedCount, completedTasks);
  const plannedRate = plannedCount > 0 ? plannedCompleted / plannedCount : 0.5;
  const completionRate = completedTasks / totalTasks;
  const raw = plannedRate * 0.6 + completionRate * 0.4;
  return Math.round(Math.min(100, Math.max(0, raw * 100)));
}