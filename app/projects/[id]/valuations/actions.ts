"use server";

import { prisma } from "@/lib/prisma";
import { recomputeCertificate } from "@/lib/bq";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCertificate(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const bq = await prisma.billOfQuantities.findUnique({
    where: { projectId },
    include: { elements: { include: { bills: { include: { items: true } } } } },
  });

  const items = bq?.elements.flatMap((e) => e.bills.flatMap((b) => b.items)) ?? [];
  if (items.length === 0) {
    throw new Error("Add Bill of Quantities items before raising a valuation.");
  }

  const lastCert = await prisma.interimCertificate.findFirst({
    where: { projectId },
    orderBy: { number: "desc" },
    include: { lines: true },
  });
  const priorPctByItem = new Map((lastCert?.lines ?? []).map((l) => [l.bqItemId, l.percentComplete]));

  const cert = await prisma.interimCertificate.create({
    data: {
      projectId,
      number: (lastCert?.number ?? 0) + 1,
      retentionPct: project.retentionPct,
      lines: {
        create: items.map((item) => {
          const pct = priorPctByItem.get(item.id) ?? 0;
          return { bqItemId: item.id, percentComplete: pct, valueToDate: item.amount * (pct / 100) };
        }),
      },
    },
  });

  await recomputeCertificate(cert.id);

  revalidatePath(`/projects/${projectId}/valuations`);
  redirect(`/projects/${projectId}/valuations/${cert.id}`);
}

export async function setLinePercent(
  projectId: string,
  certificateId: string,
  lineId: string,
  formData: FormData
) {
  const pct = Math.min(100, Math.max(0, Number(formData.get("percentComplete") ?? 0)));

  const line = await prisma.ipcLine.findUniqueOrThrow({
    where: { id: lineId },
    include: { bqItem: true },
  });

  await prisma.ipcLine.update({
    where: { id: lineId },
    data: { percentComplete: pct, valueToDate: line.bqItem.amount * (pct / 100) },
  });

  await recomputeCertificate(certificateId);

  revalidatePath(`/projects/${projectId}/valuations/${certificateId}`);
  revalidatePath(`/projects/${projectId}/valuations`);
  revalidatePath(`/projects/${projectId}/cvr`);
}

export async function certifyCertificate(projectId: string, certificateId: string) {
  await prisma.interimCertificate.update({
    where: { id: certificateId },
    data: { status: "certified" },
  });
  revalidatePath(`/projects/${projectId}/valuations/${certificateId}`);
  revalidatePath(`/projects/${projectId}/valuations`);
  revalidatePath(`/projects/${projectId}/cvr`);
}
