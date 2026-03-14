import { prisma } from "@/db/prisma";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

export async function createInvoiceForSale(
  saleId: string,
  customerId?: string,
  tx: Prisma.TransactionClient = prisma
) {
  const invoiceNumber = await generateInvoiceNumber(tx);
  return tx.invoice.create({
    data: {
      saleId,
      customerId,
      invoiceNumber
    }
  });
}

export async function listInvoices() {
  return prisma.invoice.findMany({
    select: {
      id: true,
      invoiceNumber: true,
      issuedAt: true,
      sale: {
        select: {
          totalFinal: true
        }
      },
      customer: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      issuedAt: "desc"
    }
  });
}

const listInvoicesPaginatedCached = unstable_cache(
  async (page: number, pageSize: number) => {
    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        select: {
          id: true,
          invoiceNumber: true,
          issuedAt: true,
          sale: {
            select: {
              totalFinal: true
            }
          },
          customer: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          issuedAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.invoice.count()
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  },
  ["invoices-paginated"],
  { tags: ["invoices"] }
);

export async function listInvoicesPaginated(params?: { page?: number; pageSize?: number }) {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 25));

  return listInvoicesPaginatedCached(page, pageSize);
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      sale: {
        include: {
          items: {
            include: {
              product: true
            }
          },
          user: true,
          customer: true
        }
      },
      customer: true
    }
  });
}

export async function deleteInvoice(id: string) {
  return prisma.invoice.delete({ where: { id } });
}
