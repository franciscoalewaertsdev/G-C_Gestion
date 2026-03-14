import { z } from "zod";

export const productVariantSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  stock: z.number().int().nonnegative().default(0),
  extraPrice: z.number().optional().default(0)
});

export const createProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  barcode: z
    .string()
    .optional()
    .transform((value) => {
      const normalized = value?.trim();
      return normalized && normalized.length > 0 ? normalized : undefined;
    }),
  costPrice: z.number().nonnegative(),
  price: z.number().positive(),
  currentStock: z.number().int().nonnegative().default(0),
  lowStockAlert: z.number().int().nonnegative().default(5),
  supplierId: z.string().min(1),
  variants: z.array(productVariantSchema).default([])
});

export const updateProductSchema = createProductSchema.extend({
  id: z.string().min(1)
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
