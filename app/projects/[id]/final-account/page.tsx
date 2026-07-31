import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { StatTile } from "@/app/components/StatTile";
import { FINAL_ACCOUNT_STATUS_LABEL, FINAL_ACCOUNT_STATUS_TONE, formatCurrency, formatDate } from "@/lib/format";
import { getOrCreateFinalAccount, markFinalAccountAgreed, reopenFinalAccount, updateFluctuation } from "./actions";

export const dynamic = "force-dynamic";

export default async function FinalAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [project, finalAccount, bq, variations, certificates] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id } }),
    getOrCreateFinalAccount(id),
    prisma.billOfQuantities.findUnique({
      where: { projectId: id },
      include: { elements: { include: { bills: { include: { items: true } } } } },
    }),
    prisma.variationOrder.findMany({ where: { projectId: id } }),
    prisma.interimCertificate.findMany({ where: { projectId: id }, orderBy: { certifiedDate: "desc" }, take: 1 }),
  ]);

  const originalBqTotal = (bq?.elements ?? [])
    .flatMap((e) => e.bills)
    .flatMap((b) => b.items)
    .reduce((s, i) => s + i.amount, 0);

  const approvedVos = variations.filter((v) => v.status === "approved");
  const approvedVoTotal = approvedVos.reduce((s, v) => s + v.costImpact, 0);
  const fluctuationAmount = project.hasFluctuationClause ? finalAccount.fluctuationAmount : 0;
  const finalSum = originalBqTotal + approvedVoTotal + fluctuationAmount;

  const latestCert = certificates[0] ?? null;
  const varianceVsOriginalContract = finalSum - project.contractValue;
  const varianceVsLatestCertified = latestCert ? finalSum - latestCert.grossValuation : null;

  const isAgreed = finalAccount.status === "agreed";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Original BQ total" value={formatCurrency(originalBqTotal)} accent="var(--cat-1)" />
        <StatTile
          label="Approved VOs"
          value={formatCurrency(approvedVoTotal)}
          accent="var(--cat-2)"
          sub={`${approvedVos.length} approved`}
        />
        <StatTile
          label="Fluctuations"
          value={formatCurrency(fluctuationAmount)}
          accent="var(--status-warning)"
          sub={project.hasFluctuationClause ? "Clause active" : "No fluctuation clause"}
        />
        <StatTile
          label="Final account sum"
          value={formatCurrency(finalSum)}
          accent="var(--status-good)"
          sub={
            <span className="flex items-center gap-1.5">
              vs contract
              <Badge
                tone={varianceVsOriginalContract >= 0 ? "warning" : "good"}
                label={`${varianceVsOriginalContract >= 0 ? "+" : "−"}${formatCurrency(Math.abs(varianceVsOriginalContract))}`}
              />
            </span>
          }
        />
      </div>

      <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Reconciliation</h2>
          <Badge
            tone={FINAL_ACCOUNT_STATUS_TONE[finalAccount.status] ?? "neutral"}
            label={FINAL_ACCOUNT_STATUS_LABEL[finalAccount.status] ?? finalAccount.status}
          />
        </div>
        <div className="mt-3 flex flex-col divide-y divide-[var(--gridline)] text-sm">
          <div className="flex items-center justify-between py-2">
            <span className="text-text-secondary">Original BQ total</span>
            <span className="tabular-nums text-text-primary">{formatCurrency(originalBqTotal)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text-secondary">+ Approved variation orders</span>
            <span className="tabular-nums text-text-primary">{formatCurrency(approvedVoTotal)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text-secondary">+ Fluctuations</span>
            <span className="tabular-nums text-text-primary">{formatCurrency(fluctuationAmount)}</span>
          </div>
          <div className="flex items-center justify-between py-2 font-semibold">
            <span className="text-text-primary">= Final account sum</span>
            <span className="tabular-nums text-text-primary">{formatCurrency(finalSum)}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-[var(--border-hairline)] pt-3 text-xs text-text-muted">
          <span>
            Original contract sum: <span className="tabular-nums text-text-secondary">{formatCurrency(project.contractValue)}</span>
          </span>
          {latestCert && (
            <span>
              Latest certified valuation:{" "}
              <span className="tabular-nums text-text-secondary">{formatCurrency(latestCert.grossValuation)}</span>
              {varianceVsLatestCertified !== null && (
                <>
                  {" "}
                  ({varianceVsLatestCertified >= 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(varianceVsLatestCertified))} vs final account)
                </>
              )}
            </span>
          )}
          {finalAccount.agreedDate && <span>Agreed {formatDate(finalAccount.agreedDate)}</span>}
        </div>

        <div className="mt-4">
          {isAgreed ? (
            <form action={reopenFinalAccount.bind(null, id)}>
              <button className="rounded-md border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary">
                Reopen final account
              </button>
            </form>
          ) : (
            <form action={markFinalAccountAgreed.bind(null, id)}>
              <button className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                Mark final account agreed
              </button>
            </form>
          )}
        </div>
      </div>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4" open={project.hasFluctuationClause}>
        <summary className="cursor-pointer text-sm font-medium text-text-primary">Fluctuation clause</summary>
        <form action={updateFluctuation.bind(null, id)} className="mt-4 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="hasFluctuationClause"
              defaultChecked={project.hasFluctuationClause}
              className="h-4 w-4"
            />
            <span className="text-text-secondary">This contract has a material price fluctuation clause</span>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:w-64">
            <span className="text-text-secondary">Agreed fluctuation adjustment (RM)</span>
            <input
              name="fluctuationAmount"
              type="number"
              min="0"
              step="100"
              defaultValue={finalAccount.fluctuationAmount}
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Notes (optional)</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={finalAccount.notes ?? ""}
              placeholder="Basis of fluctuation calc, index used, period covered..."
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <div>
            <button
              type="submit"
              className="rounded-md border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              Save
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
