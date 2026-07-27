import { prisma } from "./prisma";

export const VO_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "disputed",
  "rejected",
] as const;

export type VoStatus = (typeof VO_STATUSES)[number];

/**
 * The one piece of logic that makes this an integrated system rather than
 * three separate trackers: flipping a VO to "approved" pushes its cost
 * impact into the linked budget line and shifts the linked schedule task's
 * dates by the VO's schedule impact, atomically. Every other status change
 * is a plain field update.
 *
 * Only fires the cascade on the transition INTO "approved" — re-saving an
 * already-approved VO, or moving between two non-approved statuses, never
 * touches budget/schedule.
 */
export async function updateVariationOrderStatus(
  variationOrderId: string,
  nextStatus: VoStatus
) {
  return prisma.$transaction(async (tx) => {
    const vo = await tx.variationOrder.findUniqueOrThrow({
      where: { id: variationOrderId },
    });

    const enteringApproved = nextStatus === "approved" && vo.status !== "approved";

    const updated = await tx.variationOrder.update({
      where: { id: variationOrderId },
      data: {
        status: nextStatus,
        submittedAt:
          nextStatus === "submitted" && !vo.submittedAt ? new Date() : vo.submittedAt,
        approvedAt: enteringApproved ? new Date() : vo.approvedAt,
      },
    });

    if (!enteringApproved) {
      return updated;
    }

    if (vo.budgetLineId) {
      await tx.budgetLine.update({
        where: { id: vo.budgetLineId },
        data: { committed: { increment: vo.costImpact } },
      });
    }

    if (vo.scheduleTaskId && vo.scheduleImpactDays !== 0) {
      const task = await tx.scheduleTask.findUniqueOrThrow({
        where: { id: vo.scheduleTaskId },
      });
      const shiftMs = vo.scheduleImpactDays * 24 * 60 * 60 * 1000;
      await tx.scheduleTask.update({
        where: { id: vo.scheduleTaskId },
        data: {
          startDate: new Date(task.startDate.getTime() + shiftMs),
          endDate: new Date(task.endDate.getTime() + shiftMs),
        },
      });
    }

    return updated;
  });
}
