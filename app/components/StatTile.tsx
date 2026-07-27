import { ReactNode } from "react";

export function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
        {accent && (
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
        )}
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold text-text-primary">{value}</div>
      {sub && <div className="mt-1 text-xs text-text-secondary">{sub}</div>}
    </div>
  );
}
