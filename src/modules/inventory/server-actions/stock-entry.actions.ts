"use server";

import { revalidateTag } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { createStockEntrySchema } from "@/modules/inventory/schemas/stock-entry.schema";
import {
  deleteStockEntry,
  getStockEntryNotesById,
  registerStockEntry,
  updateStockEntryNotes
} from "@/modules/inventory/services/stock-entry.service";

export async function registerStockEntryAction(payload: unknown) {
  const session = await requireSession();
  const parsed = createStockEntrySchema.parse(payload);

  const result = await registerStockEntry(parsed, session.user.id);
  revalidateTag("inventory");
  revalidateTag("products");
  revalidateTag("dashboard");
  revalidateTag("reports");
  return result;
}

export async function updateStockEntryNotesAction(payload: { id: string; notes: string }) {
  await updateStockEntryNotes(payload.id, payload.notes);
  revalidateTag("inventory");
}

export async function getStockEntryNotesAction(id: string) {
  await requireSession();
  const entry = await getStockEntryNotesById(id);
  if (!entry) {
    throw new Error("Ingreso no encontrado");
  }

  return entry.notes ?? "";
}

export async function deleteStockEntryAction(id: string) {
  await deleteStockEntry(id);
  revalidateTag("inventory");
  revalidateTag("products");
  revalidateTag("dashboard");
  revalidateTag("reports");
}
