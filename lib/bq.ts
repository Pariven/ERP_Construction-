import { prisma } from "./prisma";
import { monthLabel, projectEndOrFallback } from "./health";

export const BQ_ITEM_KINDS = ["measured", "provisional_sum", "pc_sum"] as const;
export type BqItemKind = (typeof BQ_ITEM_KINDS)[number];

export function computeBqItemAmount(
  kind: string,
  quantity: number | null,
  rate: number | null,
  enteredAmount: number
) {
  if (kind === "measured") {
    return (quantity ?? 0) * (rate ?? 0);
  }
  // provisional_sum / pc_sum: a placeholder lump sum, not qty x rate
  return enteredAmount;
}

/**
 * Recomputes an IPC's cumulative valuation from its lines, then chains off
 * the previous certificate for this project (by number) to get the net
 * amount actually due this period:
 *
 *   grossValuation    = sum(line.valueToDate)
 *   retentionHeld      = grossValuation * retentionPct
 *   previousCertified  = prior certificate's (grossValuation - retentionHeld)
 *   amountCertified    = (grossValuation - retentionHeld) - previousCertified
 */
export async function recomputeCertificate(certificateId: string) {
  return prisma.$transaction(async (tx) => {
    const cert = await tx.interimCertificate.findUniqueOrThrow({
      where: { id: certificateId },
      include: { lines: true },
    });

    const grossValuation = cert.lines.reduce((s, l) => s + l.valueToDate, 0);
    const retentionHeld = grossValuation * (cert.retentionPct / 100);

    const prior = await tx.interimCertificate.findFirst({
      where: { projectId: cert.projectId, number: { lt: cert.number } },
      orderBy: { number: "desc" },
    });
    const previousCertified = prior ? prior.grossValuation - prior.retentionHeld : 0;
    const amountCertified = grossValuation - retentionHeld - previousCertified;

    return tx.interimCertificate.update({
      where: { id: certificateId },
      data: { grossValuation, retentionHeld, previousCertified, amountCertified },
    });
  });
}

type Certificate = {
  number: number;
  certifiedDate: Date;
  grossValuation: number;
  retentionHeld: number;
};

type RetentionRelease = { amount: number };

/**
 * Shared by the CVR page and the project dashboard so retention and "next
 * IPC" figures never drift between the two. "Next IPC due" is an estimate
 * (last certified date + 30 days) — there's no contractual due-date field,
 * just the standard monthly valuation cadence.
 */
export function computeRetentionSummary(certificates: Certificate[], retentionReleases: RetentionRelease[]) {
  const latestCert = certificates.at(-1) ?? null;
  const grossValuation = latestCert?.grossValuation ?? 0;
  const retentionHeldCumulative = latestCert?.retentionHeld ?? 0;
  const releasedToDate = retentionReleases.reduce((s, r) => s + r.amount, 0);
  const retentionCurrentlyHeld = Math.max(0, retentionHeldCumulative - releasedToDate);
  const nextIpcDueEstimate = latestCert ? new Date(latestCert.certifiedDate.getTime() + 30 * 86_400_000) : null;

  return { latestCert, grossValuation, retentionHeldCumulative, releasedToDate, retentionCurrentlyHeld, nextIpcDueEstimate };
}

export type SCurvePoint = { label: string; planned: number; actual: number };

/**
 * Planned baseline: BQ total spread linearly across the project's own
 * timeline. Actual: cumulative certified valuation, stepped at each IPC's
 * date. Shared by the CVR page and the project dashboard.
 */
export function computeProjectSCurve(
  project: { startDate: Date; endDate: Date | null },
  bqTotal: number,
  certificates: Certificate[],
  points = 10
): SCurvePoint[] {
  if (bqTotal <= 0) return [];

  const start = project.startDate;
  const end = projectEndOrFallback(project);
  const totalMs = Math.max(1, end.getTime() - start.getTime());

  return Array.from({ length: points }, (_, i) => {
    const fraction = i / (points - 1);
    const date = new Date(start.getTime() + fraction * totalMs);
    const planned = bqTotal * fraction;
    const actual = certificates.filter((c) => c.certifiedDate <= date).at(-1)?.grossValuation ?? 0;
    return { label: monthLabel(date), planned, actual };
  });
}
