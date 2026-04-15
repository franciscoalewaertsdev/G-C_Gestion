import { z } from "zod";

const saleItemSchema = z.object({
  productId: z.string().min(1).optional(),
  variantId: z.string().min(1).optional(),
  isManual: z.boolean().default(false),
  manualProductName: z.string().trim().min(2).optional(),
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

  value.items.forEach((item, index) => {
    if (item.isManual) {
      if (!item.manualProductName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debes indicar el nombre del producto manual.",
          path: ["items", index, "manualProductName"]
        });
      }

      if (item.productId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Los items manuales no deben tener productId.",
          path: ["items", index, "productId"]
        });
      }

      if (item.variantId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Los items manuales no pueden tener variante.",
          path: ["items", index, "variantId"]
        });
      }
      return;
    }

    if (!item.productId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes seleccionar un producto del sistema o marcarlo como manual.",
        path: ["items", index, "productId"]
      });
    }
  });
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
