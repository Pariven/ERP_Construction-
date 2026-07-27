"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addBudgetLine(projectId: string, formData: FormData) {
  const costCode = String(formData.get("costCode") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const budgeted = Number(formData.get("budgeted") ?? 0);

  if (!costCode || !category) {
    throw new Error("Cost code and category are required.");
  }

  await prisma.budgetLine.create({
    data: {
      projectId,
      costCode,
      category,
      description: description || null,
      budgeted: Number.isFinite(budgeted) ? budgeted : 0,
      committed: Number.isFinite(budgeted) ? budgeted : 0,
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
  const actual = Number(formData.get("actual") ?? 0);
  await prisma.budgetLine.update({
    where: { id: budgetLineId },
    data: { actual: Number.isFinite(actual) ? actual : 0 },
  });
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(`/projects/${projectId}`);
}
