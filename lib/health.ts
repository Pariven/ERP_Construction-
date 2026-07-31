import type { BadgeTone } from "./format";

export function expectedPercent(start: Date, end: Date, now: Date) {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - start.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export function scheduleHealth(percentComplete: number, expected: number): { tone: BadgeTone; label: string } {
  if (percentComplete >= 100) return { tone: "good", label: "Complete" };
  const diff = percentComplete - expected;
  if (diff >= -5) return { tone: "good", label: "On track" };
  if (diff >= -15) return { tone: "warning", label: "Behind" };
  return { tone: "critical", label: "Behind" };
}

export function budgetHealth(actual: number, budgeted: number): { tone: BadgeTone; label: string } {
  if (budgeted <= 0) return { tone: "neutral", label: "—" };
  const ratio = actual / budgeted;
  if (ratio <= 1) return { tone: "good", label: "Under budget" };
  if (ratio <= 1.05) return { tone: "warning", label: "Near budget" };
  return { tone: "critical", label: "Over budget" };
}

const TONE_RANK: Record<BadgeTone, number> = { good: 0, neutral: 0, warning: 1, serious: 2, critical: 3 };

export function worstTone(tones: BadgeTone[]): BadgeTone {
  return tones.reduce<BadgeTone>((worst, t) => (TONE_RANK[t] > TONE_RANK[worst] ? t : worst), "good");
}

export const HEALTH_LABEL: Record<BadgeTone, string> = {
  good: "Green",
  neutral: "Green",
  warning: "Amber",
  serious: "Amber",
  critical: "Red",
};

export function projectEndOrFallback(project: { startDate: Date; endDate: Date | null }) {
  return project.endDate ?? new Date(project.startDate.getTime() + 365 * 86_400_000);
}

export function monthLabel(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(d);
}
