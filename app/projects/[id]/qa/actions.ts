"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTemplate(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const itemsText = String(formData.get("items") ?? "");
  const items = itemsText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!name || items.length === 0) {
    throw new Error("Template name and at least one checklist item are required.");
  }

  await prisma.checklistTemplate.create({
    data: {
      name,
      category: category || null,
      items: {
        create: items.map((label, i) => ({ label, sortOrder: i })),
      },
    },
  });

  revalidatePath(`/projects/${projectId}/qa`);
}

export async function startInspection(projectId: string, formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const inspectedBy = String(formData.get("inspectedBy") ?? "").trim();

  if (!taskId || !templateId) {
    throw new Error("Task and checklist template are required.");
  }

  const template = await prisma.checklistTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  const inspection = await prisma.inspection.create({
    data: {
      projectId,
      taskId,
      templateId,
      location: location || null,
      inspectedBy: inspectedBy || null,
      results: {
        create: template.items.map((item) => ({ itemLabel: item.label })),
      },
    },
  });

  revalidatePath(`/projects/${projectId}/qa`);
  redirect(`/projects/${projectId}/qa/${inspection.id}`);
}

export async function closeDefect(projectId: string, defectId: string, formData: FormData) {
  const closedBy = String(formData.get("closedBy") ?? "").trim();
  await prisma.defect.update({
    where: { id: defectId },
    data: { status: "closed", closedAt: new Date(), closedBy: closedBy || null },
  });
  revalidatePath(`/projects/${projectId}/qa`);
  revalidatePath(`/projects/${projectId}`);
}
