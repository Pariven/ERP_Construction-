"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nonNegativeNumber } from "@/lib/num";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const type = String(formData.get("type") ?? "RESIDENTIAL");
  const contractValue = nonNegativeNumber(formData.get("contractValue"));
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
      contractValue,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  redirect(`/projects/${project.id}`);
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function updateProjectImage(projectId: string, formData: FormData) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an image file to upload.");
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Image must be a JPEG, PNG, WebP, or GIF.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${projectId}${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  await prisma.project.update({
    where: { id: projectId },
    data: { imageUrl: `/uploads/${filename}` },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}
