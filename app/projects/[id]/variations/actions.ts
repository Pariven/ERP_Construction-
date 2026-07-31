"use server";

import { prisma } from "@/lib/prisma";
import { updateVariationOrderStatus, type VoStatus } from "@/lib/variations";
import { revalidatePath } from "next/cache";

export async function createVariationOrder(projectId: string, formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const costImpact = Number(formData.get("costImpact") ?? 0);
  const scheduleImpactDays = Number(formData.get("scheduleImpactDays") ?? 0);
  const budgetLineId = String(formData.get("budgetLineId") ?? "") || null;
  const scheduleTaskId = String(formData.get("scheduleTaskId") ?? "") || null;

  if (!code || !title) {
    throw new Error("VO code and title are required.");
  }

  await prisma.variationOrder.create({
    data: {
      projectId,
      code,
      title,
      description: description || null,
      costImpact: Number.isFinite(costImpact) ? costImpact : 0,
      scheduleImpactDays: Number.isFinite(scheduleImpactDays) ? Math.round(scheduleImpactDays) : 0,
      budgetLineId,
      scheduleTaskId,
    },
  });

  revalidatePath(`/projects/${projectId}/variations`);
  revalidatePath(`/projects/${projectId}`);
}

export async function transitionVo(projectId: string, voId: string, status: VoStatus) {
  await updateVariationOrderStatus(voId, status);

  // Approving cascades into budget + schedule, so refresh every page that
  // reads those.
  revalidatePath(`/projects/${projectId}/variations`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(`/projects/${projectId}/schedule`);
  revalidatePath(`/projects/${projectId}`);
}
