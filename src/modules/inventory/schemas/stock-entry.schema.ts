import { z } from "zod";

export const stockEntryItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().positive()
});

export const createStockEntrySchema = z.object({
  supplierId: z.string().min(1),
  entryDate: z.date().optional(),
  notes: z.string().optional(),
  items: z.array(stockEntryItemSchema).min(1)
});

export type CreateStockEntryInput = z.infer<typeof createStockEntrySchema>;
