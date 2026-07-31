"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

type RateItem = { id: string; trade: string; description: string; unit: string; rate: number };

export function AddBqItemForm({
  action,
  rateLibrary,
}: {
  action: (formData: FormData) => Promise<void>;
  rateLibrary: RateItem[];
}) {
  const [kind, setKind] = useState<"measured" | "provisional_sum" | "pc_sum">("measured");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("");

  const computedAmount = useMemo(() => {
    const q = Number(quantity) || 0;
    const r = Number(rate) || 0;
    return q * r;
  }, [quantity, rate]);

  function applyRateLibraryItem(id: string) {
    const item = rateLibrary.find((r) => r.id === id);
    if (!item) return;
    setDescription(item.description);
    setUnit(item.unit);
    setRate(String(item.rate));
  }

  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rateLibrary.length > 0 && (
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-text-secondary">Copy from rate library (optional)</span>
          <select
            onChange={(e) => applyRateLibraryItem(e.target.value)}
            defaultValue=""
            className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
          >
            <option value="">— none —</option>
            {rateLibrary.map((r) => (
              <option key={r.id} value={r.id}>
                {r.trade} — {r.description} ({formatCurrency(r.rate)}/{r.unit})
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Cost code (optional)</span>
        <input
          name="costCode"
          placeholder="03-300"
          className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Kind</span>
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
        >
          <option value="measured">Measured (qty × rate)</option>
          <option value="provisional_sum">Provisional sum</option>
          <option value="pc_sum">PC sum</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="text-text-secondary">Description</span>
        <input
          name="description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-secondary">Unit</span>
        <input
          name="unit"
          required
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="m3, m2, nr, sum..."
          className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
        />
      </label>

      {kind === "measured" ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Quantity</span>
            <input
              name="quantity"
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Rate (RM)</span>
            <input
              name="rate"
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
            />
          </label>
          <div className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-text-secondary">Amount (computed)</span>
            <div className="tabular-nums font-medium text-text-primary">{formatCurrency(computedAmount)}</div>
          </div>
        </>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Lump sum amount (RM)</span>
          <input
            name="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="rounded-md border border-[var(--border-hairline)] bg-page px-3 py-2 text-sm outline-none focus:border-cat-1"
          />
        </label>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Add item
        </button>
      </div>
    </form>
  );
}
