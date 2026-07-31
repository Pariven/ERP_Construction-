"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function releaseRetention(projectId: string, formData: FormData) {
  const milestone = String(formData.get("milestone") ?? "practical_completion");
  const amount = Number(formData.get("amount") ?? 0);
  const note = String(formData.get("note") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Release amount must be greater than zero.");
  }

  await prisma.retentionRelease.create({
    data: { projectId, milestone, amount, note: note || null },
  });

  revalidatePath(`/projects/${projectId}/cvr`);
}
