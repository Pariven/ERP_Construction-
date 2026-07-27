export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

// ---------------------------------------------------------------------------
// Status → badge styling. Every badge pairs a status color with a text label
// (never color alone), per the fixed status palette (good/warning/serious/
// critical/neutral).
// ---------------------------------------------------------------------------

export type BadgeTone = "good" | "warning" | "serious" | "critical" | "neutral";

export const VO_STATUS_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  submitted: "warning",
  approved: "good",
  disputed: "critical",
  rejected: "serious",
};

export const VO_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  disputed: "Disputed",
  rejected: "Rejected",
};

export const DEFECT_STATUS_TONE: Record<string, BadgeTone> = {
  open: "critical",
  in_progress: "warning",
  closed: "good",
};

export const DEFECT_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  closed: "Closed",
};

export const TASK_STATUS_TONE: Record<string, BadgeTone> = {
  not_started: "neutral",
  in_progress: "warning",
  complete: "good",
  blocked: "critical",
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
  blocked: "Blocked",
};

export const PROJECT_STATUS_TONE: Record<string, BadgeTone> = {
  active: "good",
  on_hold: "warning",
  complete: "good",
  cancelled: "critical",
};

export const toneVar: Record<BadgeTone, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  serious: "var(--status-serious)",
  critical: "var(--status-critical)",
  neutral: "var(--status-neutral)",
};

export const PROJECT_TYPE_LABEL: Record<string, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  SUBCON: "Subcontract",
  RENOVATION: "Renovation",
};
