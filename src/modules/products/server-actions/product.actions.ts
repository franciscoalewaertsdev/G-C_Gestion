"use server";

import { revalidateTag } from "next/cache";
import { createProductSchema } from "@/modules/products/schemas/product.schema";
import {
  createProduct,
  deleteProduct,
  getProductForEdit,
  updateProduct,
  updateProductBasic
} from "@/modules/products/services/product.service";

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

export async function getProductForEditAction(id: string) {
  const product = await getProductForEdit(id);
  if (!product) {
    throw new Error("Producto no encontrado");
  }

  return product;
}

export async function updateProductFullAction(payload: {
  id: string;
  data: {
    name: string;
    description?: string;
    barcode?: string;
    costPrice: number;
    price: number;
    lowStockAlert: number;
    supplierId: string;
    selectedSizes: string[];
    existingVariants: Array<{ id: string; value: string; stock: number; extraPrice: number | null }>;
  };
}) {
  const variantBySize = new Map(payload.data.existingVariants.map((variant) => [variant.value, variant]));
  const variants = payload.data.selectedSizes.map((size) => {
    const existing = variantBySize.get(size);
    return {
      name: "Talle",
      value: size,
      stock: existing?.stock ?? 0,
      extraPrice: Number(existing?.extraPrice ?? 0)
    };
  });

  const currentStock = variants.reduce((sum, variant) => sum + variant.stock, 0);

  await updateProduct({
    id: payload.id,
    name: payload.data.name,
    description: payload.data.description,
    barcode: payload.data.barcode,
    costPrice: payload.data.costPrice,
    price: payload.data.price,
    currentStock,
    lowStockAlert: payload.data.lowStockAlert,
    supplierId: payload.data.supplierId,
    variants
  });

  revalidateTag("products");
  revalidateTag("reports");
  revalidateTag("dashboard");
}
