import { z } from "zod";

export const reportTypeSchema = z.enum(["sales", "stock", "suppliers", "invoices"]);
