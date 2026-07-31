import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/components/Badge";
import { StatTile } from "@/app/components/StatTile";
import { IPC_STATUS_TONE, formatCurrency, formatDate } from "@/lib/format";
import { certifyCertificate, setLinePercent } from "../actions";

export const dynamic = "force-dynamic";

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string; certificateId: string }>;
}) {
  const { id, certificateId } = await params;

  const cert = await prisma.interimCertificate.findUnique({
    where: { id: certificateId },
    include: {
      lines: {
        include: { bqItem: { include: { bill: { include: { element: true } } } } },
      },
    },
  });
  if (!cert || cert.projectId !== id) notFound();

  const lines = [...cert.lines].sort((a, b) =>
    `${a.bqItem.bill.element.name}/${a.bqItem.bill.name}`.localeCompare(
      `${b.bqItem.bill.element.name}/${b.bqItem.bill.name}`
    )
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/projects/${id}/valuations`} className="text-xs text-text-muted hover:text-text-secondary">
        ← Valuations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-text-primary">IPC-{cert.number}</h1>
            <Badge tone={IPC_STATUS_TONE[cert.status] ?? "neutral"} label={cert.status === "certified" ? "Certified" : "Draft"} />
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">{formatDate(cert.certifiedDate)}</p>
        </div>
        {cert.status !== "certified" && (
          <form action={certifyCertificate.bind(null, id, cert.id)}>
            <button
              type="submit"
              className="rounded-md bg-cat-1 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Certify this valuation
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Gross valuation" value={formatCurrency(cert.grossValuation)} accent="var(--cat-1)" />
        <StatTile
          label="Retention held"
          value={formatCurrency(cert.retentionHeld)}
          sub={`${cert.retentionPct}%`}
          accent="var(--status-warning)"
        />
        <StatTile label="Previously certified" value={formatCurrency(cert.previousCertified)} accent="var(--cat-2)" />
        <StatTile
          label="Amount certified this period"
          value={formatCurrency(cert.amountCertified)}
          accent="var(--status-good)"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border-hairline)] bg-surface-1">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] text-left text-xs text-text-muted">
              <th className="px-4 py-2.5 font-medium">Item</th>
              <th className="px-4 py-2.5 font-medium text-right">Amount</th>
              <th className="px-4 py-2.5 font-medium">% complete</th>
              <th className="px-4 py-2.5 font-medium text-right">Value to date</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const updateAction = setLinePercent.bind(null, id, cert.id, line.id);
              return (
                <tr key={line.id} className="border-b border-[var(--gridline)] last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="text-text-primary">{line.bqItem.description}</div>
                    <div className="text-xs text-text-muted">
                      {line.bqItem.bill.element.name} / {line.bqItem.bill.name}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-text-primary">
                    {formatCurrency(line.bqItem.amount)}
                  </td>
                  <td className="px-4 py-2.5">
                    {cert.status === "certified" ? (
                      <span className="tabular-nums text-text-primary">{line.percentComplete}%</span>
                    ) : (
                      <form action={updateAction} className="flex items-center gap-1.5">
                        <input
                          name="percentComplete"
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={line.percentComplete}
                          className="w-20 rounded-md border border-[var(--border-hairline)] bg-page px-2 py-1 text-xs outline-none focus:border-cat-1"
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-[var(--border-hairline)] px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
                        >
                          Save
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium text-text-primary">
                    {formatCurrency(line.valueToDate)}
                  </td>
                </tr>
              );
            })}
            {lines.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                  No BQ items to claim against.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
