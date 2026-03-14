import { z } from "zod";

const saleItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive()
});

export const createSaleSchema = z.object({
  generateInvoice: z.boolean().default(false),
  paymentMethod: z.enum(["EFECTIVO", "TARJETA"]).default("EFECTIVO"),
  customer: z
    .object({
      name: z.string().min(2),
      documentId: z.string().min(3),
      email: z.string().email().optional().or(z.literal(""))
    })
    .optional(),
  discountType: z.enum(["NONE", "PERCENTAGE", "FIXED"]).default("NONE"),
  discountValue: z.number().nonnegative().default(0),
  items: z.array(saleItemSchema).min(1)
}).superRefine((value, ctx) => {
  if (value.generateInvoice && !value.customer) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debes completar datos del cliente para emitir factura.",
      path: ["customer"]
    });
  }
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
