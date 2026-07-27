import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { formatCurrency, type BadgeTone } from "@/lib/format";
import { addBudgetLine, updateActualSpent } from "./actions";

export const dynamic = "force-dynamic";

function varianceTone(actual: number, budgeted: number): { tone: BadgeTone; label: string } {
  if (budgeted <= 0) return { tone: "neutral", label: "—" };
  const ratio = actual / budgeted;
  if (ratio <= 1) return { tone: "good", label: "Under" };
  if (ratio <= 1.05) return { tone: "warning", label: "Near" };
  return { tone: "critical", label: "Over" };
}

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lines = await prisma.budgetLine.findMany({
    where: { projectId: id },
    orderBy: { costCode: "asc" },
  });

  const totals = lines.reduce(
    (acc, l) => ({
      budgeted: acc.budgeted + l.budgeted,
      committed: acc.committed + l.committed,
      actual: acc.actual + l.actual,
    }),
    { budgeted: 0, committed: 0, actual: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-lg border border-[var(--border-hairline)] bg-surface-1">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] text-left text-xs text-text-muted">
              <th className="px-4 py-2.5 font-medium">Cost code</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium text-right">Budgeted</th>
              <th className="px-4 py-2.5 font-medium text-right">Committed</th>
              <th className="px-4 py-2.5 font-medium text-right">Actual</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Update actual</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const v = varianceTone(l.actual, l.budgeted);
              const updateAction = updateActualSpent.bind(null, id, l.id);
              return (
                <tr key={l.id} className="border-b border-[var(--gridline)] last:border-0">
                  <td className="px-4 py-2.5 font-medium tabular-nums text-text-primary">{l.costCode}</td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {l.category}
                    {l.description && <div className="text-xs text-text-muted">{l.description}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-primary">
                    {formatCurrency(l.budgeted)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-primary">
                    {formatCurrency(l.committed)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-primary">
                    {formatCurrency(l.actual)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={v.tone} label={v.label} />
                  </td>
                  <td className="px-4 py-2.5">
                    <form action={updateAction} className="flex items-center gap-1.5">
                      <input
                        name="actual"
                        type="number"
                        min="0"
                        step="100"
                        defaultValue={l.actual}
                        className="w-28 rounded-md border border-[var(--border-hairline)] bg-page px-2 py-1 text-xs outline-none focus:border-cat-1"
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-[var(--border-hairline)] px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {lines.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                  No budget lines yet — add the first one below.
                </td>
              </tr>
            )}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr className="border-t border-[var(--border-hairline)] text-sm font-semibold">
                <td className="px-4 py-2.5" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(totals.budgeted)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(totals.committed)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(totals.actual)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">+ Add budget line</summary>
        <form action={addBudgetLine.bind(null, id)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Cost code</span>
            <input
              name="costCode"
              required
              placeholder="03-300"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Category</span>
            <input
              name="category"
              required
              placeholder="Concrete — Foundations"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-text-secondary">Description (optional)</span>
            <input
              name="description"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Budgeted amount (USD)</span>
            <input
              name="budgeted"
              type="number"
              min="0"
              step="100"
              required
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Add line
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
