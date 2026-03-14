import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2),
  documentId: z.string().min(3),
  email: z.string().email().optional().or(z.literal(""))
});

export type CustomerInput = z.infer<typeof customerSchema>;
