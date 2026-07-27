import Link from "next/link";
import { Badge } from "./Badge";
import { formatDate, type BadgeTone } from "@/lib/format";

export type ScheduleRow = {
  id: string;
  name: string;
  costCode: string | null;
  startDate: Date;
  endDate: Date;
  percentComplete: number;
  expectedPercent: number;
  varianceTone: BadgeTone;
  varianceLabel: string;
};

export function ScheduleProgressList({
  rows,
  projectId,
}: {
  rows: ScheduleRow[];
  projectId: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-secondary">No schedule tasks yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-[var(--gridline)]">
      {rows.map((row) => (
        <div key={row.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-text-primary">{row.name}</div>
              <div className="text-xs text-text-muted">
                {row.costCode ? `${row.costCode} · ` : ""}
                {formatDate(row.startDate)} – {formatDate(row.endDate)}
              </div>
            </div>
            <Badge tone={row.varianceTone} label={row.varianceLabel} />
          </div>
          <div className="relative h-2 w-full overflow-visible rounded-full bg-[var(--gridline)]">
            <div
              className="h-2 rounded-full bg-cat-1"
              style={{ width: `${Math.min(100, Math.max(0, row.percentComplete))}%` }}
            />
            <div
              aria-hidden
              className="absolute top-[-2px] h-3 w-[2px] bg-[var(--text-muted)]"
              style={{ left: `${Math.min(100, Math.max(0, row.expectedPercent))}%` }}
              title={`Expected: ${Math.round(row.expectedPercent)}%`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-text-muted">
            <span className="tabular-nums">{Math.round(row.percentComplete)}% complete</span>
            <span className="tabular-nums">Expected {Math.round(row.expectedPercent)}%</span>
          </div>
        </div>
      ))}
      <div className="pt-3">
        <Link href={`/projects/${projectId}/schedule`} className="text-xs text-cat-1 hover:underline">
          View full schedule →
        </Link>
      </div>
    </div>
  );
}
