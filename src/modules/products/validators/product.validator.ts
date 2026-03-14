import { createProductSchema } from "@/modules/products/schemas/product.schema";

export const validateProductPayload = (payload: unknown) => createProductSchema.parse(payload);
