import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { Modal } from "@/app/components/Modal";
import { ProjectThumb } from "@/app/components/ProjectThumb";
import { StatTile } from "@/app/components/StatTile";
import { SCurveChart, type SCurvePoint } from "@/app/components/SCurveChart";
import { PROJECT_TYPE_LABEL, VO_STATUS_LABEL, VO_STATUS_TONE, formatCurrency } from "@/lib/format";
import {
  HEALTH_LABEL,
  budgetHealth,
  expectedPercent,
  monthLabel,
  projectEndOrFallback,
  scheduleHealth,
  worstTone,
} from "@/lib/health";
import { createProject } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      budgetLines: true,
      variations: true,
      tasks: true,
      inspections: { include: { results: { include: { defect: true } } } },
      certificates: { orderBy: { certifiedDate: "asc" } },
      bq: { include: { elements: { include: { bills: { include: { items: true } } } } } },
    },
  });

  const now = new Date();

  // ---------------------------------------------------------------------
  // Financial snapshot — aggregated across every project.
  // ---------------------------------------------------------------------
  const allVariations = projects.flatMap((p) => p.variations);
  const approvedVoValue = allVariations
    .filter((v) => v.status === "approved")
    .reduce((s, v) => s + v.costImpact, 0);
  const revisedContractSum = projects.reduce((s, p) => s + p.contractValue, 0) + approvedVoValue;

  const allBudgetLines = projects.flatMap((p) => p.budgetLines);
  const totalBudgeted = allBudgetLines.reduce((s, b) => s + b.budgeted, 0);
  const totalActual = allBudgetLines.reduce((s, b) => s + b.actual, 0);
  const budgetVariance = totalActual - totalBudgeted;

  const openVos = allVariations.filter((v) => v.status === "submitted" || v.status === "disputed");

  const allDefects = projects
    .flatMap((p) => p.inspections)
    .flatMap((i) => i.results)
    .map((r) => r.defect)
    .filter((d): d is NonNullable<typeof d> => Boolean(d));
  const openDefects = allDefects.filter((d) => d.status !== "closed");

  // ---------------------------------------------------------------------
  // VO status funnel + QA summary
  // ---------------------------------------------------------------------
  const voFunnel = ["draft", "submitted", "approved", "disputed", "rejected"].map((status) => ({
    status,
    count: allVariations.filter((v) => v.status === status).length,
  }));

  const allResults = projects.flatMap((p) => p.inspections).flatMap((i) => i.results);
  const reviewedResults = allResults.filter((r) => r.passed !== null);
  const passRate = reviewedResults.length
    ? Math.round((reviewedResults.filter((r) => r.passed).length / reviewedResults.length) * 100)
    : null;
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const closedThisWeek = allDefects.filter((d) => d.status === "closed" && d.closedAt && d.closedAt >= weekAgo).length;

  // ---------------------------------------------------------------------
  // Portfolio cash flow — each project's BQ total spread across its own
  // timeline, summed at shared points across the whole portfolio.
  // ---------------------------------------------------------------------
  const projectsWithBq = projects
    .map((p) => ({
      start: p.startDate,
      end: projectEndOrFallback(p),
      bqTotal: (p.bq?.elements ?? [])
        .flatMap((e) => e.bills)
        .flatMap((b) => b.items)
        .reduce((s, i) => s + i.amount, 0),
      certificates: p.certificates,
    }))
    .filter((p) => p.bqTotal > 0);

  let sCurve: SCurvePoint[] = [];
  if (projectsWithBq.length > 0) {
    const portfolioStart = new Date(Math.min(...projectsWithBq.map((p) => p.start.getTime())));
    const portfolioEnd = new Date(Math.max(...projectsWithBq.map((p) => p.end.getTime())));
    const totalMs = Math.max(1, portfolioEnd.getTime() - portfolioStart.getTime());
    const POINTS = 9;
    sCurve = Array.from({ length: POINTS }, (_, i) => {
      const date = new Date(portfolioStart.getTime() + (i / (POINTS - 1)) * totalMs);
      let planned = 0;
      let actual = 0;
      for (const proj of projectsWithBq) {
        const projMs = Math.max(1, proj.end.getTime() - proj.start.getTime());
        const fraction = Math.min(1, Math.max(0, (date.getTime() - proj.start.getTime()) / projMs));
        planned += proj.bqTotal * fraction;
        actual += proj.certificates.filter((c) => c.certifiedDate <= date).at(-1)?.grossValuation ?? 0;
      }
      return { label: monthLabel(date), planned, actual };
    });
  }

  // ---------------------------------------------------------------------
  // Portfolio project list — health-colored rows.
  // ---------------------------------------------------------------------
  const rows = projects.map((p) => {
    const actual = p.budgetLines.reduce((s, b) => s + b.actual, 0);
    const budgeted = p.budgetLines.reduce((s, b) => s + b.budgeted, 0);
    const avgComplete = p.tasks.length ? p.tasks.reduce((s, t) => s + t.percentComplete, 0) / p.tasks.length : 0;
    const avgExpected = p.tasks.length
      ? p.tasks.reduce((s, t) => s + expectedPercent(t.startDate, t.endDate, now), 0) / p.tasks.length
      : 0;

    const health = worstTone([budgetHealth(actual, budgeted).tone, scheduleHealth(avgComplete, avgExpected).tone]);
    const projectOpenVos = p.variations.filter((v) => v.status === "submitted" || v.status === "disputed").length;
    const projectOpenDefects = p.inspections
      .flatMap((i) => i.results)
      .map((r) => r.defect)
      .filter((d) => d && d.status !== "closed").length;

    return {
      id: p.id,
      name: p.name,
      clientName: p.clientName,
      type: p.type,
      imageUrl: p.imageUrl,
      updatedAt: p.updatedAt,
      avgComplete,
      budgeted,
      actual,
      health,
      projectOpenVos,
      projectOpenDefects,
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Portfolio dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        </div>
        <NewProjectModal />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border-hairline)] p-8 text-center text-sm text-text-secondary">
          No projects yet — create your first one to get started.
        </div>
      ) : (
        <>
          {/* Financial snapshot */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Revised contract sum"
              value={formatCurrency(revisedContractSum)}
              accent="var(--cat-1)"
              sub="Contract value + approved VOs"
            />
            <StatTile
              label="Budget variance"
              value={`${budgetVariance >= 0 ? "+" : "−"}${formatCurrency(Math.abs(budgetVariance))}`}
              accent={budgetVariance <= 0 ? "var(--status-good)" : "var(--status-critical)"}
              sub={budgetVariance <= 0 ? "Under budget, portfolio-wide" : "Over budget, portfolio-wide"}
            />
            <StatTile label="Open VOs" value={openVos.length} accent="var(--status-warning)" sub="Across all projects" />
            <StatTile
              label="Open defects"
              value={openDefects.length}
              accent="var(--status-critical)"
              sub="Across all projects"
            />
          </div>

          {/* Cash flow */}
          <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
            <h2 className="mb-1 text-sm font-semibold text-text-primary">Cash flow — planned vs. actual</h2>
            <p className="mb-3 text-xs text-text-muted">
              Each project&apos;s BQ total spread across its own timeline, summed portfolio-wide.
            </p>
            {sCurve.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-secondary">
                No priced Bills of Quantities yet — add one from a project&apos;s BQ tab to see the curve here.
              </p>
            ) : (
              <SCurveChart data={sCurve} />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* VO funnel */}
            <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">Variation order status</h2>
              <div className="flex flex-col divide-y divide-[var(--gridline)]">
                {voFunnel.map((f) => (
                  <div key={f.status} className="flex items-center justify-between py-1.5 text-sm">
                    <Badge tone={VO_STATUS_TONE[f.status] ?? "neutral"} label={VO_STATUS_LABEL[f.status] ?? f.status} />
                    <span className="tabular-nums font-medium text-text-primary">{f.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* QA summary */}
            <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">QA inspections</h2>
              <div className="flex flex-col divide-y divide-[var(--gridline)] text-sm">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-text-secondary">Pass rate</span>
                  <span className="tabular-nums font-medium text-text-primary">
                    {passRate === null ? "—" : `${passRate}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-text-secondary">Open defects</span>
                  <span className="tabular-nums font-medium text-text-primary">{openDefects.length}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-text-secondary">Closed this week</span>
                  <span className="tabular-nums font-medium text-text-primary">{closedThisWeek}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio project list */}
          <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-2">
            <h2 className="px-2 pb-2 pt-1 text-sm font-semibold text-text-primary">Projects</h2>
            <div className="flex flex-col divide-y divide-[var(--gridline)]">
              {rows.map((r) => (
                <Link
                  key={r.id}
                  href={`/projects/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-2 py-3 hover:bg-page"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ProjectThumb imageUrl={r.imageUrl} updatedAt={r.updatedAt} name={r.name} size={40} />
                    <div className="min-w-0">
                      <div className="font-medium text-text-primary">{r.name}</div>
                      <div className="text-xs text-text-muted">
                        {PROJECT_TYPE_LABEL[r.type] ?? r.type} · {Math.round(r.avgComplete)}% complete
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-xs text-text-muted">
                    <div className="text-right">
                      <div className="tabular-nums text-text-primary">
                        {r.budgeted > 0 ? `${Math.round((r.actual / r.budgeted) * 100)}%` : "—"}
                      </div>
                      <div>budget used</div>
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums text-text-primary">{r.projectOpenVos}</div>
                      <div>open VOs</div>
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums text-text-primary">{r.projectOpenDefects}</div>
                      <div>defects</div>
                    </div>
                    <Badge tone={r.health} label={HEALTH_LABEL[r.health]} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}

function NewProjectModal() {
  return (
    <Modal
      title="New project"
      buttonLabel="+ New project"
      buttonClassName="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
    >
      <form action={createProject} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Project name</span>
          <input
            name="name"
            required
            className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            placeholder="Riverside Residences"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Client</span>
          <input
            name="clientName"
            required
            className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            placeholder="Maple Grove Developments"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Type</span>
          <select
            name="type"
            className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
          >
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="SUBCON">Subcontract</option>
            <option value="RENOVATION">Renovation</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Contract value (RM)</span>
          <input
            name="contractValue"
            type="number"
            min="0"
            step="1000"
            required
            className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            placeholder="1500000"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Start date</span>
          <input
            name="startDate"
            type="date"
            required
            className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Target end date</span>
          <input
            name="endDate"
            type="date"
            className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Create project
          </button>
        </div>
      </form>
    </Modal>
  );
}
