"use server";

import { prisma } from "@/lib/prisma";
import { nonNegativeNumber } from "@/lib/num";
import { revalidatePath } from "next/cache";

export async function createPackage(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const costCode = String(formData.get("costCode") ?? "").trim();
  const ownEstimateRaw = formData.get("ownEstimate");
  const ownEstimate = ownEstimateRaw && String(ownEstimateRaw).trim() !== "" ? nonNegativeNumber(ownEstimateRaw) : null;

  if (!name) throw new Error("Package name is required.");

  await prisma.procurementPackage.create({
    data: { projectId, name, costCode: costCode || null, ownEstimate },
  });

  revalidatePath(`/projects/${projectId}/procurement`);
}

export async function addQuote(projectId: string, packageId: string, formData: FormData) {
  const subcontractor = String(formData.get("subcontractor") ?? "").trim();
  const amount = nonNegativeNumber(formData.get("amount"));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!subcontractor || amount <= 0) {
    throw new Error("Subcontractor name and a quote amount greater than zero are required.");
  }

  await prisma.procurementQuote.create({
    data: { packageId, subcontractor, amount, notes: notes || null },
  });

  revalidatePath(`/projects/${projectId}/procurement`);
}

export async function awardQuote(projectId: string, packageId: string, quoteId: string) {
  await prisma.$transaction([
    prisma.procurementQuote.updateMany({ where: { packageId }, data: { isAwarded: false } }),
    prisma.procurementQuote.update({ where: { id: quoteId }, data: { isAwarded: true } }),
    prisma.procurementPackage.update({ where: { id: packageId }, data: { status: "awarded" } }),
  ]);
  revalidatePath(`/projects/${projectId}/procurement`);
}

export async function reopenPackage(projectId: string, packageId: string) {
  await prisma.$transaction([
    prisma.procurementQuote.updateMany({ where: { packageId }, data: { isAwarded: false } }),
    prisma.procurementPackage.update({ where: { id: packageId }, data: { status: "open" } }),
  ]);
  revalidatePath(`/projects/${projectId}/procurement`);
}

export async function markQuotePaid(projectId: string, quoteId: string, formData: FormData) {
  const quote = await prisma.procurementQuote.findUniqueOrThrow({ where: { id: quoteId } });
  const paidAmountRaw = formData.get("paidAmount");
  const paidAmount = paidAmountRaw && String(paidAmountRaw).trim() !== "" ? nonNegativeNumber(paidAmountRaw) : quote.amount;

  await prisma.procurementQuote.update({
    where: { id: quoteId },
    data: { paymentStatus: "paid", paidAmount, paidDate: new Date() },
  });

  revalidatePath(`/projects/${projectId}/procurement`);
  revalidatePath(`/projects/${projectId}`);
}

export async function revertQuotePayment(projectId: string, quoteId: string) {
  await prisma.procurementQuote.update({
    where: { id: quoteId },
    data: { paymentStatus: "pending", paidAmount: null, paidDate: null },
  });
  revalidatePath(`/projects/${projectId}/procurement`);
  revalidatePath(`/projects/${projectId}`);
}
