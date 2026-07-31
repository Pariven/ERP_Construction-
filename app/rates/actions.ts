"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { nonNegativeNumber } from "@/lib/num";

export async function addRateLibraryItem(formData: FormData) {
  const trade = String(formData.get("trade") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const rate = nonNegativeNumber(formData.get("rate"));

  if (!trade || !description || !unit) {
    throw new Error("Trade, description, and unit are required.");
  }

  await prisma.rateLibraryItem.create({
    data: { trade, description, unit, rate },
  });

  revalidatePath("/rates");
}

export async function deleteRateLibraryItem(id: string) {
  await prisma.rateLibraryItem.delete({ where: { id } });
  revalidatePath("/rates");
}
