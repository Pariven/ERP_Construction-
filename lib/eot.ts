import { prisma } from "./prisma";

export const EOT_STATUSES = ["claimed", "under_review", "approved", "rejected"] as const;
export type EotStatus = (typeof EOT_STATUSES)[number];

/**
 * Approving an EOT pushes the project's contractual end date out by the
 * approved days, automatically — the same "don't just track it, act on it"
 * pattern as VO approval. LAD exposure (below) is measured against that
 * pushed-out date, so an approved EOT directly reduces LAD exposure.
 */
export async function updateEotStatus(
  eotId: string,
  status: EotStatus,
  daysApprovedOverride?: number
) {
  return prisma.$transaction(async (tx) => {
    const eot = await tx.extensionOfTime.findUniqueOrThrow({ where: { id: eotId } });
    const enteringApproved = status === "approved" && eot.status !== "approved";
    const isTerminal = status === "approved" || status === "rejected";

    const approvedDays = enteringApproved ? daysApprovedOverride ?? eot.daysClaimed : eot.daysApproved;

    const updated = await tx.extensionOfTime.update({
      where: { id: eotId },
      data: {
        status,
        daysApproved: status === "rejected" ? 0 : approvedDays,
        decidedDate: isTerminal ? new Date() : eot.decidedDate,
      },
    });

    if (enteringApproved && approvedDays) {
      const project = await tx.project.findUniqueOrThrow({ where: { id: eot.projectId } });
      if (project.endDate) {
        await tx.project.update({
          where: { id: eot.projectId },
          data: { endDate: new Date(project.endDate.getTime() + approvedDays * 86_400_000) },
        });
      }
    }

    return updated;
  });
}

export type LadTerms = {
  endDate: Date | null;
  ladRatePerDay: number;
  ladGraceDays: number;
  ladCapPct: number | null;
  contractValue: number;
};

export function calculateLadExposure(project: LadTerms, now: Date = new Date()) {
  if (!project.endDate || project.ladRatePerDay <= 0) {
    return { daysOverrun: 0, rawExposure: 0, exposure: 0, isCapped: false, graceEndDate: null as Date | null };
  }

  const graceEndDate = new Date(project.endDate.getTime() + project.ladGraceDays * 86_400_000);
  const overrunMs = now.getTime() - graceEndDate.getTime();
  const daysOverrun = overrunMs > 0 ? Math.floor(overrunMs / 86_400_000) : 0;
  const rawExposure = daysOverrun * project.ladRatePerDay;

  const cap = project.ladCapPct != null ? project.contractValue * (project.ladCapPct / 100) : null;
  const isCapped = cap != null && rawExposure > cap;
  const exposure = isCapped ? (cap as number) : rawExposure;

  return { daysOverrun, rawExposure, exposure, isCapped, graceEndDate };
}
