import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { IPC_STATUS_TONE, formatCurrency, formatDate } from "@/lib/format";
import { createCertificate } from "./actions";

export const dynamic = "force-dynamic";

export default async function ValuationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const certificates = await prisma.interimCertificate.findMany({
    where: { projectId: id },
    orderBy: { number: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-lg border border-[var(--border-hairline)] bg-surface-1">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] text-left text-xs text-text-muted">
              <th className="px-4 py-2.5 font-medium">IPC</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium text-right">Gross valuation</th>
              <th className="px-4 py-2.5 font-medium text-right">Retention</th>
              <th className="px-4 py-2.5 font-medium text-right">Amount certified</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {certificates.map((c) => (
              <tr key={c.id} className="border-b border-[var(--gridline)] last:border-0 hover:bg-page">
                <td className="px-4 py-2.5">
                  <Link href={`/projects/${id}/valuations/${c.id}`} className="font-medium text-cat-1 hover:underline">
                    IPC-{c.number}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-text-secondary">{formatDate(c.certifiedDate)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-text-primary">
                  {formatCurrency(c.grossValuation)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-text-primary">
                  {formatCurrency(c.retentionHeld)} ({c.retentionPct}%)
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium text-text-primary">
                  {formatCurrency(c.amountCertified)}
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={IPC_STATUS_TONE[c.status] ?? "neutral"} label={c.status === "certified" ? "Certified" : "Draft"} />
                </td>
              </tr>
            ))}
            {certificates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                  No valuations yet — raise the first interim certificate below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form action={createCertificate.bind(null, id)}>
        <button
          type="submit"
          className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Raise interim certificate
        </button>
      </form>

      <p className="text-xs text-text-muted">
        Each new certificate carries forward the previous % complete per BQ item as a starting point — update it,
        then the gross valuation, retention, and amount certified recompute automatically.
      </p>
    </div>
  );
}
