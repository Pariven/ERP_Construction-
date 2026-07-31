"use server";

import { prisma } from "@/lib/prisma";
import { computeBqItemAmount, type BqItemKind } from "@/lib/bq";
import { nonNegativeNumber } from "@/lib/num";
import { revalidatePath } from "next/cache";

export async function getOrCreateBq(projectId: string) {
  const existing = await prisma.billOfQuantities.findUnique({ where: { projectId } });
  if (existing) return existing;
  return prisma.billOfQuantities.create({ data: { projectId } });
}

export async function addElement(projectId: string, bqId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Element name is required.");

  const count = await prisma.bqElement.count({ where: { bqId } });
  await prisma.bqElement.create({ data: { bqId, name, sortOrder: count } });
  revalidatePath(`/projects/${projectId}/bq`);
}

export async function addBill(projectId: string, elementId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Bill name is required.");

  const count = await prisma.bqBill.count({ where: { elementId } });
  await prisma.bqBill.create({ data: { elementId, name, sortOrder: count } });
  revalidatePath(`/projects/${projectId}/bq`);
}

export async function addItem(projectId: string, billId: string, formData: FormData) {
  const costCode = String(formData.get("costCode") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const kind = String(formData.get("kind") ?? "measured") as BqItemKind;
  const quantity = formData.get("quantity") ? nonNegativeNumber(formData.get("quantity")) : null;
  const rate = formData.get("rate") ? nonNegativeNumber(formData.get("rate")) : null;
  const enteredAmount = nonNegativeNumber(formData.get("amount"));

  if (!description || !unit) {
    throw new Error("Description and unit are required.");
  }

  const amount = computeBqItemAmount(kind, quantity, rate, enteredAmount);
  const count = await prisma.bqItem.count({ where: { billId } });

  await prisma.bqItem.create({
    data: {
      billId,
      costCode: costCode || null,
      description,
      unit,
      kind,
      quantity: kind === "measured" ? quantity : null,
      rate: kind === "measured" ? rate : null,
      amount,
      sortOrder: count,
    },
  });

  revalidatePath(`/projects/${projectId}/bq`);
}

// BQ items already claimed on an interim certificate can't be deleted — the
// certificate's valuation depends on them, and silently orphaning that
// history would corrupt past IPCs. Each delete checks for that first so it
// fails with a clear message instead of a raw foreign-key constraint error.

export async function deleteElement(projectId: string, elementId: string) {
  const claimedCount = await prisma.ipcLine.count({
    where: { bqItem: { bill: { elementId } } },
  });
  if (claimedCount > 0) {
    throw new Error(
      "Can't delete this element — one or more of its items have already been claimed on an interim certificate."
    );
  }
  await prisma.bqElement.delete({ where: { id: elementId } });
  revalidatePath(`/projects/${projectId}/bq`);
}

export async function deleteBill(projectId: string, billId: string) {
  const claimedCount = await prisma.ipcLine.count({
    where: { bqItem: { billId } },
  });
  if (claimedCount > 0) {
    throw new Error(
      "Can't delete this bill — one or more of its items have already been claimed on an interim certificate."
    );
  }
  await prisma.bqBill.delete({ where: { id: billId } });
  revalidatePath(`/projects/${projectId}/bq`);
}

export async function deleteItem(projectId: string, itemId: string) {
  const claimedCount = await prisma.ipcLine.count({ where: { bqItemId: itemId } });
  if (claimedCount > 0) {
    throw new Error("Can't delete this item — it has already been claimed on an interim certificate.");
  }
  await prisma.bqItem.delete({ where: { id: itemId } });
  revalidatePath(`/projects/${projectId}/bq`);
}
