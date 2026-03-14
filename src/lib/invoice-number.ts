import { prisma } from "@/db/prisma";
import { Prisma } from "@prisma/client";

export async function generateInvoiceNumber(tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const invoices = await tx.invoice.findMany({
    select: {
      invoiceNumber: true
    }
  });

  const lastSequence = invoices.reduce((max, invoice) => {
    const match = invoice.invoiceNumber.match(/(\d+)$/);
    if (!match) {
      return max;
    }

    const numericValue = Number(match[1]);
    if (Number.isNaN(numericValue)) {
      return max;
    }

    return Math.max(max, numericValue);
  }, 0);

  return String(lastSequence + 1).padStart(5, "0");
}
