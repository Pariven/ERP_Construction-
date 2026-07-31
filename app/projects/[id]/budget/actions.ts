"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { nonNegativeNumber } from "@/lib/num";

export async function addBudgetLine(projectId: string, formData: FormData) {
  const costCode = String(formData.get("costCode") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const budgeted = nonNegativeNumber(formData.get("budgeted"));

  if (!costCode || !category) {
    throw new Error("Cost code and category are required.");
  }

  await prisma.budgetLine.create({
    data: {
      projectId,
      costCode,
      category,
      description: description || null,
      budgeted,
      committed: budgeted,
    },
  });

  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateActualSpent(
  projectId: string,
  budgetLineId: string,
  formData: FormData
) {
  const actual = nonNegativeNumber(formData.get("actual"));
  await prisma.budgetLine.update({
    where: { id: budgetLineId },
    data: { actual },
  });
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(`/projects/${projectId}`);
}
