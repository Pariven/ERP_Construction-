import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatTile } from "@/app/components/StatTile";
import { Badge } from "@/app/components/Badge";
import { BudgetChart, type BudgetChartRow } from "@/app/components/BudgetChart";
import { SCurveChart } from "@/app/components/SCurveChart";
import { ScheduleProgressList, type ScheduleRow } from "@/app/components/ScheduleProgressList";
import {
  DEFECT_STATUS_LABEL,
  DEFECT_STATUS_TONE,
  VO_STATUS_LABEL,
  VO_STATUS_TONE,
  formatCurrency,
  formatDate,
} from "@/lib/format";
import { budgetHealth as budgetTone, expectedPercent, scheduleHealth as scheduleTone } from "@/lib/health";
import { computeProjectSCurve, computeRetentionSummary } from "@/lib/bq";
import { calculateLadExposure } from "@/lib/eot";

export const dynamic = "force-dynamic";

const VO_STALE_AFTER_DAYS = 14;

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, certificates, retentionReleases, bq, procurementPackages, eots] = await Promise.all([
    prisma.project.findUniqueOrThrow({
      where: { id },
      include: {
        budgetLines: { orderBy: { costCode: "asc" } },
        tasks: { orderBy: { startDate: "asc" } },
        variations: { orderBy: { createdAt: "desc" } },
        inspections: { include: { results: { include: { defect: true } } } },
      },
    }),
    prisma.interimCertificate.findMany({ where: { projectId: id }, orderBy: { certifiedDate: "asc" } }),
    prisma.retentionRelease.findMany({ where: { projectId: id } }),
    prisma.billOfQuantities.findUnique({
      where: { projectId: id },
      include: { elements: { include: { bills: { include: { items: true } } } } },
    }),
    prisma.procurementPackage.findMany({ where: { projectId: id }, include: { quotes: true } }),
    prisma.extensionOfTime.findMany({ where: { projectId: id } }),
  ]);

  const now = new Date();

  const totalBudgeted = project.budgetLines.reduce((s, b) => s + b.budgeted, 0);
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

  // --- Payments / retention ------------------------------------------------
  const bqTotal = (bq?.elements ?? [])
    .flatMap((e) => e.bills)
    .flatMap((b) => b.items)
    .reduce((s, i) => s + i.amount, 0);
  const { latestCert, retentionCurrentlyHeld, nextIpcDueEstimate } = computeRetentionSummary(
    certificates,
    retentionReleases
  );
  const sCurve = computeProjectSCurve(project, bqTotal, certificates);

  // --- Subcontractor payment status -----------------------------------------
  const awardedQuotes = procurementPackages.flatMap((p) => p.quotes).filter((q) => q.isAwarded);
  const paymentsDue = awardedQuotes.filter((q) => q.paymentStatus !== "paid");
  const amountDueToSubs = paymentsDue.reduce((s, q) => s + q.amount, 0);

  // --- EOT / LAD -------------------------------------------------------------
  const eotPendingDays = eots
    .filter((e) => e.status === "claimed" || e.status === "under_review")
    .reduce((s, e) => s + e.daysClaimed, 0);
  const eotApprovedDays = eots.filter((e) => e.status === "approved").reduce((s, e) => s + (e.daysApproved ?? 0), 0);
  const lad = calculateLadExposure(project, now);

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

      {/* Payments & contract admin — the daily QS checks */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Retention held"
          value={formatCurrency(retentionCurrentlyHeld)}
          accent="var(--status-warning)"
          sub={`${project.retentionPct}% of each valuation`}
        />
        <StatTile
          label="Next IPC due"
          value={nextIpcDueEstimate ? formatDate(nextIpcDueEstimate) : "—"}
          accent="var(--cat-1)"
          sub={latestCert ? `Est., 30 days after IPC-${latestCert.number}` : "No IPCs raised yet"}
        />
        <StatTile
          label="Subcontractor payments"
          value={paymentsDue.length}
          accent={paymentsDue.length > 0 ? "var(--status-critical)" : "var(--status-good)"}
          sub={paymentsDue.length > 0 ? `${formatCurrency(amountDueToSubs)} due` : "All awarded quotes paid"}
        />
        <StatTile
          label="EOT / LAD exposure"
          value={formatCurrency(lad.exposure)}
          accent={lad.exposure > 0 ? "var(--status-critical)" : "var(--status-good)"}
          sub={`${eotPendingDays}d pending · ${eotApprovedDays}d approved`}
        />
      </div>

      {/* Cash flow */}
      <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Cash flow — planned vs. actual</h2>
          <Link href={`/projects/${project.id}/cvr`} className="text-xs text-cat-1 hover:underline">
            View CVR →
          </Link>
        </div>
        {sCurve.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">
            Add Bill of Quantities items to generate the planned baseline.
          </p>
        ) : (
          <SCurveChart data={sCurve} />
        )}
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
              {recentVos.map((v) => {
                const isPending = v.status === "submitted" || v.status === "disputed";
                const ageDays = isPending
                  ? Math.floor((now.getTime() - (v.submittedAt ?? v.createdAt).getTime()) / 86_400_000)
                  : null;
                const isStale = ageDays !== null && ageDays > VO_STALE_AFTER_DAYS;
                return (
                  <div key={v.id} className="flex items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {v.code} — {v.title}
                      </div>
                      <div className="text-xs text-text-muted">
                        {formatCurrency(v.costImpact)}
                        {v.scheduleImpactDays !== 0 ? ` · ${v.scheduleImpactDays}d` : ""}
                        {ageDays !== null && !isStale ? ` · ${ageDays}d pending` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={VO_STATUS_TONE[v.status] ?? "neutral"} label={VO_STATUS_LABEL[v.status] ?? v.status} />
                      {isStale && <Badge tone="critical" label={`Stale · ${ageDays}d`} />}
                    </div>
                  </div>
                );
              })}
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
