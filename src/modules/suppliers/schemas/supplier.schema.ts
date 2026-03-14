import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(2),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional()
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
