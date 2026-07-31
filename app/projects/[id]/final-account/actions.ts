"use server";

import { prisma } from "@/lib/prisma";
import { nonNegativeNumber } from "@/lib/num";
import { revalidatePath } from "next/cache";

export async function getOrCreateFinalAccount(projectId: string) {
  const existing = await prisma.finalAccount.findUnique({ where: { projectId } });
  if (existing) return existing;
  return prisma.finalAccount.create({ data: { projectId } });
}

export async function updateFluctuation(projectId: string, formData: FormData) {
  const hasFluctuationClause = formData.get("hasFluctuationClause") === "on";
  const fluctuationAmount = nonNegativeNumber(formData.get("fluctuationAmount"));
  const notes = String(formData.get("notes") ?? "").trim();

  await prisma.project.update({
    where: { id: projectId },
    data: { hasFluctuationClause },
  });

  await prisma.finalAccount.upsert({
    where: { projectId },
    create: { projectId, fluctuationAmount, notes: notes || null },
    update: { fluctuationAmount, notes: notes || null },
  });

  revalidatePath(`/projects/${projectId}/final-account`);
}

export async function markFinalAccountAgreed(projectId: string) {
  await prisma.finalAccount.upsert({
    where: { projectId },
    create: { projectId, status: "agreed", agreedDate: new Date() },
    update: { status: "agreed", agreedDate: new Date() },
  });
  revalidatePath(`/projects/${projectId}/final-account`);
}

export async function reopenFinalAccount(projectId: string) {
  await prisma.finalAccount.update({
    where: { projectId },
    data: { status: "draft", agreedDate: null },
  });
  revalidatePath(`/projects/${projectId}/final-account`);
}
