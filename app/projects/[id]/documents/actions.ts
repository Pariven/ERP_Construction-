"use server";

import { prisma } from "@/lib/prisma";
import { DOCUMENT_CATEGORIES } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

export async function uploadDocument(projectId: string, formData: FormData) {
  const category = String(formData.get("category") ?? "other");
  const name = String(formData.get("name") ?? "").trim();
  const version = String(formData.get("version") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const file = formData.get("file");

  if (!name) {
    throw new Error("Document name is required.");
  }
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to upload.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Unsupported file type — PDF, image, Word, Excel, or plain text only.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).replace(/[^a-zA-Z0-9.]/g, "");
  const filename = `${randomUUID()}${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "documents", projectId);
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  await prisma.document.create({
    data: {
      projectId,
      category: DOCUMENT_CATEGORIES.includes(category as (typeof DOCUMENT_CATEGORIES)[number])
        ? category
        : "other",
      name,
      version: version || null,
      fileUrl: `/uploads/documents/${projectId}/${filename}`,
      fileType: file.type,
      notes: notes || null,
    },
  });

  revalidatePath(`/projects/${projectId}/documents`);
}

export async function deleteDocument(projectId: string, documentId: string) {
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  await prisma.document.delete({ where: { id: documentId } });

  // Best-effort file cleanup — a missing file on disk shouldn't block the
  // record from being removed.
  try {
    await unlink(path.join(process.cwd(), "public", doc.fileUrl.replace(/^\//, "")));
  } catch {
    // ignore
  }

  revalidatePath(`/projects/${projectId}/documents`);
}
