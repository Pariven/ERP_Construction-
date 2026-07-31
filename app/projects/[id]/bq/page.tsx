import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { BQ_ITEM_KIND_LABEL, BQ_ITEM_KIND_TONE, formatCurrency } from "@/lib/format";
import { addBill, addElement, addItem, deleteBill, deleteElement, deleteItem, getOrCreateBq } from "./actions";
import { AddBqItemForm } from "./AddBqItemForm";

export const dynamic = "force-dynamic";

export default async function BqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const bq = await getOrCreateBq(id);
  const [elements, rateLibrary] = await Promise.all([
    prisma.bqElement.findMany({
      where: { bqId: bq.id },
      orderBy: { sortOrder: "asc" },
      include: {
        bills: {
          orderBy: { sortOrder: "asc" },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        },
      },
    }),
    prisma.rateLibraryItem.findMany({ orderBy: [{ trade: "asc" }, { description: "asc" }] }),
  ]);

  const bqTotal = elements
    .flatMap((e) => e.bills)
    .flatMap((b) => b.items)
    .reduce((s, i) => s + i.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">{bq.name}</h2>
          <div className="text-right">
            <div className="text-xs text-text-muted">BQ total</div>
            <div className="text-lg font-semibold tabular-nums">{formatCurrency(bqTotal)}</div>
          </div>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Elements → bills → items. Item amounts feed the Valuations tab, where you claim against them.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {elements.map((element) => {
          const elementTotal = element.bills.flatMap((b) => b.items).reduce((s, i) => s + i.amount, 0);
          return (
            <div key={element.id} className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-text-primary">{element.name}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums text-text-secondary">{formatCurrency(elementTotal)}</span>
                  <form action={deleteElement.bind(null, id, element.id)}>
                    <button className="text-xs text-text-muted hover:text-[var(--status-critical)]">Remove</button>
                  </form>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {element.bills.map((bill) => {
                  const billTotal = bill.items.reduce((s, i) => s + i.amount, 0);
                  return (
                    <div key={bill.id} className="rounded-md border border-[var(--gridline)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium text-text-primary">{bill.name}</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-xs tabular-nums text-text-secondary">{formatCurrency(billTotal)}</span>
                          <form action={deleteBill.bind(null, id, bill.id)}>
                            <button className="text-xs text-text-muted hover:text-[var(--status-critical)]">
                              Remove
                            </button>
                          </form>
                        </div>
                      </div>

                      {bill.items.length > 0 && (
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full min-w-[600px] text-xs">
                            <thead>
                              <tr className="border-b border-[var(--gridline)] text-left text-text-muted">
                                <th className="py-1.5 pr-2 font-medium">Description</th>
                                <th className="py-1.5 pr-2 font-medium">Kind</th>
                                <th className="py-1.5 pr-2 font-medium text-right">Qty</th>
                                <th className="py-1.5 pr-2 font-medium text-right">Rate</th>
                                <th className="py-1.5 pr-2 font-medium text-right">Amount</th>
                                <th className="py-1.5 font-medium" />
                              </tr>
                            </thead>
                            <tbody>
                              {bill.items.map((item) => (
                                <tr key={item.id} className="border-b border-[var(--gridline)] last:border-0">
                                  <td className="py-1.5 pr-2 text-text-secondary">
                                    {item.description}
                                    {item.costCode && <span className="ml-1 text-text-muted">({item.costCode})</span>}
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <Badge
                                      tone={BQ_ITEM_KIND_TONE[item.kind] ?? "neutral"}
                                      label={BQ_ITEM_KIND_LABEL[item.kind] ?? item.kind}
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2 text-right tabular-nums text-text-primary">
                                    {item.quantity != null ? `${item.quantity} ${item.unit}` : "—"}
                                  </td>
                                  <td className="py-1.5 pr-2 text-right tabular-nums text-text-primary">
                                    {item.rate != null ? formatCurrency(item.rate) : "—"}
                                  </td>
                                  <td className="py-1.5 pr-2 text-right tabular-nums font-medium text-text-primary">
                                    {formatCurrency(item.amount)}
                                  </td>
                                  <td className="py-1.5 text-right">
                                    <form action={deleteItem.bind(null, id, item.id)}>
                                      <button className="text-text-muted hover:text-[var(--status-critical)]">
                                        ✕
                                      </button>
                                    </form>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-cat-1">+ Add item</summary>
                        <div className="mt-3">
                          <AddBqItemForm action={addItem.bind(null, id, bill.id)} rateLibrary={rateLibrary} />
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-cat-1">+ Add bill</summary>
                <form action={addBill.bind(null, id, element.id)} className="mt-2 flex gap-2">
                  <input
                    name="name"
                    required
                    placeholder="Concrete Work"
                    className="flex-1 rounded-md border border-[var(--border-hairline)] bg-page px-3 py-1.5 text-sm outline-none focus:border-cat-1"
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
                  >
                    Add
                  </button>
                </form>
              </details>
            </div>
          );
        })}

        {elements.length === 0 && (
          <div className="rounded-lg border border-dashed border-[var(--border-hairline)] p-8 text-center text-sm text-text-secondary">
            No elements yet — add the first one below (e.g. &quot;Substructure&quot;).
          </div>
        )}
      </div>

      <details className="rounded-lg border border-[var(--border-hairline)] bg-surface-1 p-4">
        <summary className="cursor-pointer text-sm font-medium text-text-primary">+ Add element</summary>
        <form action={addElement.bind(null, id, bq.id)} className="mt-4 flex gap-2">
          <input
            name="name"
            required
            placeholder="Substructure"
            className="flex-1 rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
          />
          <button
            type="submit"
            className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Add element
          </button>
        </form>
      </details>
    </div>
  );
}
