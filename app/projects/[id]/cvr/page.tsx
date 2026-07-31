import { prisma } from "@/lib/prisma";
import { StatTile } from "@/app/components/StatTile";
import { SCurveChart } from "@/app/components/SCurveChart";
import { computeProjectSCurve, computeRetentionSummary } from "@/lib/bq";
import { formatCurrency, formatDate, type BadgeTone } from "@/lib/format";
import { releaseRetention } from "./actions";

export const dynamic = "force-dynamic";

export default async function CvrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [project, budgetLines, certificates, bq, retentionReleases] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id } }),
    prisma.budgetLine.findMany({ where: { projectId: id } }),
    prisma.interimCertificate.findMany({ where: { projectId: id }, orderBy: { certifiedDate: "asc" } }),
    prisma.billOfQuantities.findUnique({
      where: { projectId: id },
      include: { elements: { include: { bills: { include: { items: true } } } } },
    }),
    prisma.retentionRelease.findMany({ where: { projectId: id }, orderBy: { releasedAt: "desc" } }),
  ]);

  const costToDate = budgetLines.reduce((s, b) => s + b.actual, 0);
  const bqTotal = (bq?.elements ?? [])
    .flatMap((e) => e.bills)
    .flatMap((b) => b.items)
    .reduce((s, i) => s + i.amount, 0);

  const { grossValuation: valueToDate, retentionHeldCumulative, releasedToDate, retentionCurrentlyHeld } =
    computeRetentionSummary(certificates, retentionReleases);

  const cvrPosition = valueToDate - costToDate;
  const cvrTone: { tone: BadgeTone; label: string } =
    cvrPosition >= 0 ? { tone: "good", label: "Surplus — value exceeds cost" } : { tone: "critical", label: "Deficit — cost exceeds value" };

  const sCurve = computeProjectSCurve(project, bqTotal, certificates);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Value to date" value={formatCurrency(valueToDate)} accent="var(--cat-1)" sub="Latest certified gross valuation" />
        <StatTile label="Cost to date" value={formatCurrency(costToDate)} accent="var(--cat-2)" sub="Actual spend, incl. subcontractors" />
        <StatTile
          label="CVR position"
          value={formatCurrency(Math.abs(cvrPosition))}
          accent={cvrPosition >= 0 ? "var(--status-good)" : "var(--status-critical)"}
          sub={cvrTone.label}
        />
        <StatTile
          label="Retention held"
          value={formatCurrency(retentionCurrentlyHeld)}
          accent="var(--status-warning)"
          sub={releasedToDate > 0 ? `${formatCurrency(releasedToDate)} released` : "None released yet"}
        />
      </div>

      <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <h2 className="mb-1 text-sm font-semibold text-text-primary">Cash flow — planned vs. actual (S-curve)</h2>
        <p className="mb-3 text-xs text-text-muted">
          Planned baseline spreads the BQ total linearly across the contract period; actual is cumulative certified
          valuation at each IPC date.
        </p>
        {bqTotal === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary">
            Add Bill of Quantities items to generate the planned baseline.
          </p>
        ) : (
          <SCurveChart data={sCurve} />
        )}
      </div>

      <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Retention</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-text-muted">Cumulative retention withheld to date</div>
            <div className="text-lg font-semibold tabular-nums">{formatCurrency(retentionHeldCumulative)}</div>
            <div className="mt-3 flex flex-col divide-y divide-[var(--gridline)]">
              {retentionReleases.length === 0 ? (
                <p className="py-2 text-xs text-text-secondary">No releases recorded yet.</p>
              ) : (
                retentionReleases.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 text-xs">
                    <span className="text-text-secondary">
                      {r.milestone === "practical_completion" ? "Practical completion" : "Final / defects liability end"} ·{" "}
                      {formatDate(r.releasedAt)}
                    </span>
                    <span className="tabular-nums font-medium text-text-primary">{formatCurrency(r.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <form action={releaseRetention.bind(null, id)} className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-secondary">Release milestone</span>
              <select
                name="milestone"
                className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
              >
                <option value="practical_completion">Practical completion (typically half)</option>
                <option value="final">Final — defects liability period end</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-secondary">Amount (RM)</span>
              <input
                name="amount"
                type="number"
                min="0"
                step="100"
                required
                className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-text-secondary">Note (optional)</span>
              <input
                name="note"
                className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
              />
            </label>
            <button
              type="submit"
              className="mt-1 self-start rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Record release
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
