"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const type = String(formData.get("type") ?? "RESIDENTIAL");
  const contractValue = Number(formData.get("contractValue") ?? 0);
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  if (!name || !clientName || !startDate) {
    throw new Error("Project name, client, and start date are required.");
  }

  const project = await prisma.project.create({
    data: {
      name,
      clientName,
      type,
      contractValue: Number.isFinite(contractValue) ? contractValue : 0,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  redirect(`/projects/${project.id}`);
}
