"use server";

import { revalidateTag } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { createSaleSchema } from "@/modules/sales/schemas/sale.schema";
import {
  calculateDiscount,
  deleteSale,
  registerSale,
  updateSaleDiscount
} from "@/modules/sales/services/sale.service";

export async function registerSaleAction(payload: unknown) {
  const session = await requireSession();
  const parsed = createSaleSchema.parse(payload);
  const sale = await registerSale(parsed, session.user.id);

  revalidateTag("sales");
  revalidateTag("products");
  revalidateTag("dashboard");
  revalidateTag("invoices");
  revalidateTag("reports");

  return sale;
}

export async function applyDiscountAction(payload: {
  subtotal: number;
  discountType: "NONE" | "PERCENTAGE" | "FIXED";
  discountValue: number;
}) {
  return calculateDiscount(payload.subtotal, payload.discountType, payload.discountValue);
}

export async function updateSaleDiscountAction(payload: {
  id: string;
  discountType: "NONE" | "PERCENTAGE" | "FIXED";
  discountValue: number;
}) {
  await updateSaleDiscount(payload.id, payload.discountType, payload.discountValue);
  revalidateTag("sales");
  revalidateTag("dashboard");
  revalidateTag("invoices");
  revalidateTag("reports");
}

export async function deleteSaleAction(id: string) {
  await deleteSale(id);
  revalidateTag("sales");
  revalidateTag("products");
  revalidateTag("dashboard");
  revalidateTag("invoices");
  revalidateTag("reports");
}
