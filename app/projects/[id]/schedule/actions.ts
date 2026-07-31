"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addScheduleTask(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const costCode = String(formData.get("costCode") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  if (!name || !startDate || !endDate) {
    throw new Error("Task name, start date, and end date are required.");
  }

  await prisma.scheduleTask.create({
    data: {
      projectId,
      name,
      costCode: costCode || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });

  revalidatePath(`/projects/${projectId}/schedule`);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTaskProgress(
  projectId: string,
  taskId: string,
  formData: FormData
) {
  const percentComplete = Number(formData.get("percentComplete") ?? 0);
  const clamped = Math.round(Math.min(100, Math.max(0, Number.isFinite(percentComplete) ? percentComplete : 0)));

  await prisma.scheduleTask.update({
    where: { id: taskId },
    data: {
      percentComplete: clamped,
      status: clamped >= 100 ? "complete" : clamped > 0 ? "in_progress" : "not_started",
    },
  });

  revalidatePath(`/projects/${projectId}/schedule`);
  revalidatePath(`/projects/${projectId}`);
}
