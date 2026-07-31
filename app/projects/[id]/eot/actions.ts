"use server";

import { prisma } from "@/lib/prisma";
import { updateEotStatus, type EotStatus } from "@/lib/eot";
import { nonNegativeNumber } from "@/lib/num";
import { revalidatePath } from "next/cache";

export async function createEot(projectId: string, formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const daysClaimed = Math.round(nonNegativeNumber(formData.get("daysClaimed")));
  const linkedVoId = String(formData.get("linkedVoId") ?? "") || null;

  if (!code || !reason || daysClaimed <= 0) {
    throw new Error("Code, reason, and a positive number of days claimed are required.");
  }

  await prisma.extensionOfTime.create({
    data: { projectId, code, reason, daysClaimed, linkedVoId },
  });

  revalidatePath(`/projects/${projectId}/eot`);
}

export async function transitionEot(
  projectId: string,
  eotId: string,
  status: EotStatus,
  formData?: FormData
) {
  const daysApprovedRaw = formData?.get("daysApproved");
  const daysApproved =
    daysApprovedRaw && String(daysApprovedRaw).trim() !== ""
      ? Math.round(nonNegativeNumber(daysApprovedRaw))
      : undefined;

  await updateEotStatus(eotId, status, daysApproved);

  // Approving shifts the project's end date, which LAD exposure and the
  // CVR/portfolio S-curves all read.
  revalidatePath(`/projects/${projectId}/eot`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/cvr`);
  revalidatePath("/projects");
}

export async function updateLadTerms(projectId: string, formData: FormData) {
  const ladRatePerDay = nonNegativeNumber(formData.get("ladRatePerDay"));
  const ladGraceDays = Math.round(nonNegativeNumber(formData.get("ladGraceDays")));
  const ladCapPctRaw = formData.get("ladCapPct");
  const ladCapPct =
    ladCapPctRaw && String(ladCapPctRaw).trim() !== "" ? nonNegativeNumber(ladCapPctRaw) : null;

  await prisma.project.update({
    where: { id: projectId },
    data: { ladRatePerDay, ladGraceDays, ladCapPct },
  });

  revalidatePath(`/projects/${projectId}/eot`);
}
