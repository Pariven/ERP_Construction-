import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatTile } from "@/app/components/StatTile";
import { Badge } from "@/app/components/Badge";
import { BudgetChart, type BudgetChartRow } from "@/app/components/BudgetChart";
import { ScheduleProgressList, type ScheduleRow } from "@/app/components/ScheduleProgressList";
import {
  DEFECT_STATUS_LABEL,
  DEFECT_STATUS_TONE,
  VO_STATUS_LABEL,
  VO_STATUS_TONE,
  formatCurrency,
  formatDate,
  type BadgeTone,
} from "@/lib/format";

export const dynamic = "force-dynamic";

function expectedPercent(start: Date, end: Date, now: Date) {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - start.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

function scheduleTone(percentComplete: number, expected: number): { tone: BadgeTone; label: string } {
  if (percentComplete >= 100) return { tone: "good", label: "Complete" };
  const diff = percentComplete - expected;
  if (diff >= -5) return { tone: "good", label: "On track" };
  if (diff >= -15) return { tone: "warning", label: "Behind" };
  return { tone: "critical", label: "Behind" };
}

function budgetTone(actual: number, budgeted: number): { tone: BadgeTone; label: string } {
  if (budgeted <= 0) return { tone: "neutral", label: "—" };
  const ratio = actual / budgeted;
  if (ratio <= 1) return { tone: "good", label: "Under budget" };
  if (ratio <= 1.05) return { tone: "warning", label: "Near budget" };
  return { tone: "critical", label: "Over budget" };
}

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUniqueOrThrow({
    where: { id },
    include: {
      budgetLines: { orderBy: { costCode: "asc" } },
      tasks: { orderBy: { startDate: "asc" } },
      variations: { orderBy: { createdAt: "desc" } },
      inspections: {
        include: { results: { include: { defect: true } } },
      },
    },
  });

  const now = new Date();

  const totalBudgeted = project.budgetLines.reduce((s, b) => s + b.budgeted, 0);
  const totalCommitted = project.budgetLines.reduce((s, b) => s + b.committed, 0);
  const totalActual = project.budgetLines.reduce((s, b) => s + b.actual, 0);
  const budgetStatus = budgetTone(totalActual, totalBudgeted);

  const budgetChartData: BudgetChartRow[] = project.budgetLines.map((b) => ({
    category: b.category,
    costCode: b.costCode,
    budgeted: b.budgeted,
    actual: b.actual,
  }));

  const scheduleRows: ScheduleRow[] = project.tasks.map((t) => {
    const expected = expectedPercent(t.startDate, t.endDate, now);
    const { tone, label } = scheduleTone(t.percentComplete, expected);
    return {
      id: t.id,
      name: t.name,
      costCode: t.costCode,
      startDate: t.startDate,
      endDate: t.endDate,
      percentComplete: t.percentComplete,
      expectedPercent: expected,
      varianceTone: tone,
      varianceLabel: label,
    };
  });

  const avgComplete = project.tasks.length
    ? project.tasks.reduce((s, t) => s + t.percentComplete, 0) / project.tasks.length
    : 0;
  const avgExpected = project.tasks.length
    ? project.tasks.reduce((s, t) => s + expectedPercent(t.startDate, t.endDate, now), 0) /
      project.tasks.length
    : 0;
  const scheduleOverall = scheduleTone(avgComplete, avgExpected);

  const openVos = project.variations.filter(
    (v) => v.status === "submitted" || v.status === "disputed"
  );
  const costAtRisk = openVos.reduce((s, v) => s + v.costImpact, 0);
  const recentVos = project.variations.slice(0, 5);

  const openDefects = project.inspections
    .flatMap((i) => i.results)
    .map((r) => r.defect)
    .filter((d): d is NonNullable<typeof d> => Boolean(d) && d!.status !== "closed");
  const criticalDefects = openDefects.filter((d) => d.severity === "critical" || d.severity === "high").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Stat tiles — the four things this dashboard exists to answer */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Budget vs actual"
          value={formatCurrency(totalActual)}
          accent="var(--cat-2)"
          sub={
            <span className="flex items-center gap-1.5">
              of {formatCurrency(totalBudgeted)} budgeted
              <Badge tone={budgetStatus.tone} label={budgetStatus.label} />
            </span>
          }
        />
        <StatTile
          label="Schedule progress"
          value={`${Math.round(avgComplete)}%`}
          accent="var(--cat-1)"
          sub={
            <span className="flex items-center gap-1.5">
              expected ~{Math.round(avgExpected)}%
              <Badge tone={scheduleOverall.tone} label={scheduleOverall.label} />
            </span>
          }
        />
        <StatTile
          label="Open variation orders"
          value={openVos.length}
          accent="var(--status-warning)"
          sub={openVos.length > 0 ? `${formatCurrency(costAtRisk)} pending decision` : "None pending"}
        />
        <StatTile
          label="Open defects"
          value={openDefects.length}
          accent="var(--status-critical)"
          sub={
            openDefects.length > 0
              ? `${criticalDefects} high/critical severity`
              : "No open defects"
          }
        />
      </div>

      {/* Budget vs actual */}
      <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Budget vs actual by cost code</h2>
          <Link href={`/projects/${project.id}/budget`} className="text-xs text-cat-1 hover:underline">
            View budget table →
          </Link>
        </div>
        {budgetChartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">No budget lines yet.</p>
        ) : (
          <BudgetChart data={budgetChartData} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Schedule */}
        <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Schedule</h2>
          <ScheduleProgressList rows={scheduleRows.slice(0, 5)} projectId={project.id} />
        </div>

        {/* Open VOs */}
        <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Recent variation orders</h2>
            <Link href={`/projects/${project.id}/variations`} className="text-xs text-cat-1 hover:underline">
              View all →
            </Link>
          </div>
          {recentVos.length === 0 ? (
            <p className="text-sm text-text-secondary">No variation orders yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--gridline)]">
              {recentVos.map((v) => (
                <div key={v.id} className="flex items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-text-primary">
                      {v.code} — {v.title}
                    </div>
                    <div className="text-xs text-text-muted">
                      {formatCurrency(v.costImpact)}
                      {v.scheduleImpactDays !== 0 ? ` · ${v.scheduleImpactDays}d` : ""}
                    </div>
                  </div>
                  <Badge tone={VO_STATUS_TONE[v.status] ?? "neutral"} label={VO_STATUS_LABEL[v.status] ?? v.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open defects */}
        <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Open defects</h2>
            <Link href={`/projects/${project.id}/qa`} className="text-xs text-cat-1 hover:underline">
              View QA →
            </Link>
          </div>
          {openDefects.length === 0 ? (
            <p className="text-sm text-text-secondary">No open defects. Nice work.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--gridline)]">
              {openDefects.slice(0, 5).map((d) => (
                <div key={d!.id} className="flex items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-text-primary">{d!.description}</div>
                    <div className="text-xs text-text-muted">
                      Raised {formatDate(d!.raisedAt)} · {d!.severity}
                    </div>
                  </div>
                  <Badge tone={DEFECT_STATUS_TONE[d!.status] ?? "neutral"} label={DEFECT_STATUS_LABEL[d!.status] ?? d!.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
