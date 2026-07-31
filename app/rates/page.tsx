import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { addRateLibraryItem, deleteRateLibraryItem } from "./actions";

export const dynamic = "force-dynamic";

export default async function RatesPage() {
  const items = await prisma.rateLibraryItem.findMany({ orderBy: [{ trade: "asc" }, { description: "asc" }] });

  const byTrade = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.trade] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Rate library</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Reusable unit rates by trade — priced once, reused across every project&apos;s Bill of Quantities.
        </p>
      </div>

      {Object.keys(byTrade).length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--border-hairline)] p-8 text-center text-sm text-text-secondary">
          No rates yet — add the first one below.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {Object.entries(byTrade).map(([trade, rows]) => (
          <div key={trade} className="overflow-x-auto rounded-lg border border-[var(--border-hairline)] bg-surface-1">
            <div className="border-b border-[var(--border-hairline)] px-4 py-2.5 text-sm font-semibold text-text-primary">
              {trade}
            </div>
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border-hairline)] text-left text-xs text-text-muted">
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Unit</th>
                  <th className="px-4 py-2 font-medium text-right">Rate</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--gridline)] last:border-0">
                    <td className="px-4 py-2 text-text-secondary">{r.description}</td>
                    <td className="px-4 py-2 tabular-nums text-text-primary">{r.unit}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-text-primary">{formatCurrency(r.rate)}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteRateLibraryItem.bind(null, r.id)}>
                        <button className="text-xs text-text-muted hover:text-[var(--status-critical)]">Remove</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">+ Add rate</summary>
        <form action={addRateLibraryItem} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Trade</span>
            <input
              name="trade"
              required
              placeholder="Concrete"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Unit</span>
            <input
              name="unit"
              required
              placeholder="m3"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-text-secondary">Description</span>
            <input
              name="description"
              required
              placeholder="Reinforced concrete, foundations, C30/37"
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Rate (RM)</span>
            <input
              name="rate"
              type="number"
              min="0"
              step="0.01"
              required
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Add rate
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
