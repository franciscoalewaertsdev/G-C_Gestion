"use server";

import { revalidateTag } from "next/cache";
import { createProductSchema } from "@/modules/products/schemas/product.schema";
import { createProduct, deleteProduct, updateProductBasic } from "@/modules/products/services/product.service";

export async function createProductAction(payload: unknown) {
  const parsed = createProductSchema.parse(payload);
  const product = await createProduct(parsed);
  revalidateTag("products");
  revalidateTag("reports");
  revalidateTag("dashboard");
  return product;
}

export async function deleteProductAction(id: string) {
  await deleteProduct(id);
  revalidateTag("products");
  revalidateTag("reports");
  revalidateTag("dashboard");
}

export async function updateProductBasicAction(payload: {
  id: string;
  name: string;
  description?: string;
  costPrice: number;
  price: number;
  currentStock: number;
  lowStockAlert: number;
  variantStocks?: Array<{ id: string; stock: number }>;
}) {
  await updateProductBasic(payload.id, {
    name: payload.name,
    description: payload.description,
    costPrice: payload.costPrice,
    price: payload.price,
    currentStock: payload.currentStock,
    lowStockAlert: payload.lowStockAlert,
    variantStocks: payload.variantStocks
  });
  revalidateTag("products");
  revalidateTag("reports");
  revalidateTag("dashboard");
}
