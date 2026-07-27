"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function setResult(
  projectId: string,
  inspectionId: string,
  resultId: string,
  formData: FormData
) {
  const passed = formData.get("passed") === "pass";
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.inspectionResult.update({
    where: { id: resultId },
    data: { passed, notes: notes || null },
  });

  if (!passed) {
    const description = String(formData.get("defectDescription") ?? "").trim() || notes || "Failed checklist item";
    const severity = String(formData.get("severity") ?? "medium");
    const correctiveAction = String(formData.get("correctiveAction") ?? "").trim();

    await prisma.defect.upsert({
      where: { resultId },
      create: {
        resultId,
        description,
        severity,
        correctiveAction: correctiveAction || null,
      },
      update: {
        description,
        severity,
        correctiveAction: correctiveAction || null,
      },
    });
  } else {
    // Passing a previously-failed item clears its defect record.
    await prisma.defect.deleteMany({ where: { resultId } });
  }

  revalidatePath(`/projects/${projectId}/qa/${inspectionId}`);
  revalidatePath(`/projects/${projectId}/qa`);
  revalidatePath(`/projects/${projectId}`);
}

export async function setDefectStatus(
  projectId: string,
  inspectionId: string,
  defectId: string,
  status: "open" | "in_progress" | "closed"
) {
  await prisma.defect.update({
    where: { id: defectId },
    data: {
      status,
      closedAt: status === "closed" ? new Date() : null,
    },
  });
  revalidatePath(`/projects/${projectId}/qa/${inspectionId}`);
  revalidatePath(`/projects/${projectId}/qa`);
  revalidatePath(`/projects/${projectId}`);
}

export async function completeInspection(projectId: string, inspectionId: string) {
  await prisma.inspection.update({
    where: { id: inspectionId },
    data: { status: "complete" },
  });
  revalidatePath(`/projects/${projectId}/qa/${inspectionId}`);
  revalidatePath(`/projects/${projectId}/qa`);
}
