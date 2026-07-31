// Intl's built-in `style: "currency"` for MYR renders as "RM 1,234" (with a
// space) outside Malaysian locales, or "MYR 1,234" in en-US — neither
// matches the conventional "RM1,234" — so RM is prefixed manually with the
// sign handled separately (avoids "RM-1,234" from formatting a negative
// number directly).
export function formatCurrency(value: number) {
  const sign = value < 0 ? "−" : "";
  const formatted = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 0 }).format(Math.abs(value));
  return `${sign}RM${formatted}`;
}

export function formatCompactCurrency(value: number) {
  const sign = value < 0 ? "−" : "";
  const formatted = new Intl.NumberFormat("en-MY", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.abs(value));
  return `${sign}RM${formatted}`;
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

export const BQ_ITEM_KIND_LABEL: Record<string, string> = {
  measured: "Measured",
  provisional_sum: "Provisional sum",
  pc_sum: "PC sum",
};

export const BQ_ITEM_KIND_TONE: Record<string, BadgeTone> = {
  measured: "neutral",
  provisional_sum: "warning",
  pc_sum: "warning",
};

export const IPC_STATUS_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  certified: "good",
};

export const DOCUMENT_CATEGORIES = ["drawing", "contract", "correspondence", "other"] as const;

export const DOCUMENT_CATEGORY_LABEL: Record<string, string> = {
  drawing: "Drawing",
  contract: "Contract",
  correspondence: "Correspondence",
  other: "Other",
};

export const EOT_STATUS_TONE: Record<string, BadgeTone> = {
  claimed: "neutral",
  under_review: "warning",
  approved: "good",
  rejected: "critical",
};

export const EOT_STATUS_LABEL: Record<string, string> = {
  claimed: "Claimed",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

export const PROCUREMENT_STATUS_TONE: Record<string, BadgeTone> = {
  open: "warning",
  awarded: "good",
  cancelled: "critical",
};

export const PROCUREMENT_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  awarded: "Awarded",
  cancelled: "Cancelled",
};

export const FINAL_ACCOUNT_STATUS_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  agreed: "good",
};

export const FINAL_ACCOUNT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  agreed: "Agreed",
};

export const PROJECT_TYPE_LABEL: Record<string, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  SUBCON: "Subcontract",
  RENOVATION: "Renovation",
};
