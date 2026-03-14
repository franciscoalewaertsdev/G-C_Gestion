"use server";

import { revalidateTag } from "next/cache";
import { createSupplierSchema } from "@/modules/suppliers/schemas/supplier.schema";
import { createSupplier, deleteSupplier, updateSupplier } from "@/modules/suppliers/services/supplier.service";

export async function createSupplierAction(payload: unknown) {
  const parsed = createSupplierSchema.parse(payload);
  const supplier = await createSupplier(parsed);
  revalidateTag("suppliers");
  revalidateTag("products");
  revalidateTag("reports");
  return supplier;
}

export async function updateSupplierAction(payload: {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  await updateSupplier(payload.id, payload);
  revalidateTag("suppliers");
  revalidateTag("products");
  revalidateTag("reports");
}

export async function deleteSupplierAction(id: string) {
  await deleteSupplier(id);
  revalidateTag("suppliers");
  revalidateTag("products");
  revalidateTag("reports");
}
