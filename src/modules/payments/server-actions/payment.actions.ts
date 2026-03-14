"use server";

import { revalidateTag } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/db/prisma";

export async function setMonthlyPaymentStatusAction(payload: {
  supplierId: string;
  year: number;
  month: number;
  isPaid: boolean;
}) {
  await requireSession();

  if (payload.month < 1 || payload.month > 12) {
    throw new Error("Mes invalido para registrar pago.");
  }

  await prisma.supplierMonthlyPayment.upsert({
    where: {
      supplierId_year_month: {
        supplierId: payload.supplierId,
        year: payload.year,
        month: payload.month
      }
    },
    create: {
      supplierId: payload.supplierId,
      year: payload.year,
      month: payload.month,
      isPaid: payload.isPaid,
      paidAt: payload.isPaid ? new Date() : null
    },
    update: {
      isPaid: payload.isPaid,
      paidAt: payload.isPaid ? new Date() : null
    }
  });

  revalidateTag("payments");
  revalidateTag("reports");
}
