import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { PROCUREMENT_STATUS_LABEL, PROCUREMENT_STATUS_TONE, formatCurrency, formatDate } from "@/lib/format";
import { addQuote, awardQuote, createPackage, markQuotePaid, reopenPackage, revertQuotePayment } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProcurementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const packages = await prisma.procurementPackage.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    include: { quotes: { orderBy: { amount: "asc" } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {packages.map((pkg) => {
          const lowest = pkg.quotes.length ? Math.min(...pkg.quotes.map((q) => q.amount)) : null;
          const awarded = pkg.quotes.find((q) => q.isAwarded);

          return (
            <div key={pkg.id} className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{pkg.name}</span>
                    <Badge tone={PROCUREMENT_STATUS_TONE[pkg.status] ?? "neutral"} label={PROCUREMENT_STATUS_LABEL[pkg.status] ?? pkg.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-text-muted">
                    {pkg.costCode ? `${pkg.costCode} · ` : ""}
                    {pkg.ownEstimate != null ? `Estimate: ${formatCurrency(pkg.ownEstimate)}` : "No estimate on file"}
                  </div>
                </div>
                {pkg.status === "awarded" && (
                  <form action={reopenPackage.bind(null, id, pkg.id)}>
                    <button className="rounded-md border border-[var(--border-hairline)] px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary">
                      Reopen
                    </button>
                  </form>
                )}
              </div>

              {pkg.quotes.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--gridline)] text-left text-xs text-text-muted">
                        <th className="py-1.5 pr-2 font-medium">Subcontractor</th>
                        <th className="py-1.5 pr-2 font-medium text-right">Quote</th>
                        <th className="py-1.5 pr-2 font-medium text-right">vs. estimate</th>
                        <th className="py-1.5 pr-2 font-medium">Submitted</th>
                        <th className="py-1.5 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {pkg.quotes.map((q) => {
                        const delta = pkg.ownEstimate != null ? q.amount - pkg.ownEstimate : null;
                        return (
                          <tr key={q.id} className="border-b border-[var(--gridline)] last:border-0">
                            <td className="py-1.5 pr-2 text-text-primary">
                              {q.subcontractor}
                              {q.amount === lowest && <span className="ml-1.5 text-[10px] text-cat-1">lowest</span>}
                              {q.notes && <div className="text-xs text-text-muted">{q.notes}</div>}
                            </td>
                            <td className="py-1.5 pr-2 text-right tabular-nums font-medium text-text-primary">
                              {formatCurrency(q.amount)}
                            </td>
                            <td className="py-1.5 pr-2 text-right tabular-nums text-text-muted">
                              {delta === null ? "—" : `${delta >= 0 ? "+" : "−"}${formatCurrency(Math.abs(delta))}`}
                            </td>
                            <td className="py-1.5 pr-2 text-xs text-text-muted">{formatDate(q.submittedAt)}</td>
                            <td className="py-1.5 text-right">
                              {q.isAwarded ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  {q.paymentStatus === "paid" ? (
                                    <>
                                      <Badge tone="good" label="Paid" />
                                      <form action={revertQuotePayment.bind(null, id, q.id)}>
                                        <button className="text-xs text-text-muted hover:text-text-secondary">Undo</button>
                                      </form>
                                    </>
                                  ) : (
                                    <>
                                      <Badge tone="warning" label="Payment due" />
                                      <form action={markQuotePaid.bind(null, id, q.id)}>
                                        <button className="rounded-md border border-[var(--border-hairline)] px-2 py-1 text-xs text-text-secondary hover:text-text-primary">
                                          Mark paid
                                        </button>
                                      </form>
                                    </>
                                  )}
                                </div>
                              ) : pkg.status === "open" ? (
                                <form action={awardQuote.bind(null, id, pkg.id, q.id)}>
                                  <button className="rounded-md border border-[var(--border-hairline)] px-2 py-1 text-xs text-text-secondary hover:text-text-primary">
                                    Award
                                  </button>
                                </form>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {awarded && (
                <p className="mt-2 text-xs text-[var(--success-text)]">
                  Awarded to {awarded.subcontractor} at {formatCurrency(awarded.amount)}.
                  {awarded.paymentStatus === "paid" && awarded.paidDate && ` Paid ${formatDate(awarded.paidDate)}.`}
                </p>
              )}

              {pkg.status === "open" && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-cat-1">+ Add quote</summary>
                  <form action={addQuote.bind(null, id, pkg.id)} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      name="subcontractor"
                      required
                      placeholder="Subcontractor name"
                      className="rounded-md border border-[var(--border-hairline)] bg-page px-2.5 py-1.5 text-sm outline-none focus:border-cat-1 sm:col-span-1"
                    />
                    <input
                      name="amount"
                      type="number"
                      min="0"
                      step="100"
                      required
                      placeholder="Quote amount"
                      className="rounded-md border border-[var(--border-hairline)] bg-page px-2.5 py-1.5 text-sm outline-none focus:border-cat-1"
                    />
                    <input
                      name="notes"
                      placeholder="Notes (optional)"
                      className="rounded-md border border-[var(--border-hairline)] bg-page px-2.5 py-1.5 text-sm outline-none focus:border-cat-1"
                    />
                    <div className="sm:col-span-3">
                      <button className="rounded-md border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary">
                        Add quote
                      </button>
                    </div>
                  </form>
                </details>
              )}
            </div>
          );
        })}

        {packages.length === 0 && (
          <div className="rounded-lg border border-dashed border-[var(--border-hairline)] p-8 text-center text-sm text-text-secondary">
            No procurement packages yet — add the first one below.
          </div>
        )}
      </div>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">+ Add package</summary>
        <form action={createPackage.bind(null, id)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Package name</span>
            <input
              name="name"
              required
              placeholder="Structural Steel Package"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Cost code (optional)</span>
            <input
              name="costCode"
              placeholder="05-100"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Your own estimate (optional)</span>
            <input
              name="ownEstimate"
              type="number"
              min="0"
              step="100"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Add package
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
