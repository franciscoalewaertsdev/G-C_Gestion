import { prisma } from "@/db/prisma";
import { unstable_cache } from "next/cache";
import { endOfDay, endOfMonth, startOfDay, startOfMonth, subDays } from "date-fns";

const getDashboardMetricsCached = unstable_cache(
  async () => {
    const now = new Date();

    const [salesToday, salesMonth, lowStock, latestEntries, latestSales, trend, byPaymentMethod, bySupplier] =
      await Promise.all([
        prisma.sale.aggregate({
          where: { saleDate: { gte: startOfDay(now), lte: endOfDay(now) } },
          _sum: { totalFinal: true }
        }),
        prisma.sale.aggregate({
          where: { saleDate: { gte: startOfMonth(now), lte: endOfMonth(now) } },
          _sum: { totalFinal: true }
        }),
        prisma.product.findMany({
          select: {
            id: true,
            name: true,
            currentStock: true,
            lowStockAlert: true
          },
          where: {
            currentStock: {
              lte: prisma.product.fields.lowStockAlert
            }
          },
          orderBy: {
            currentStock: "asc"
          },
          take: 8
        }),
        prisma.stockEntry.findMany({
          take: 5,
          orderBy: { entryDate: "desc" },
          select: {
            id: true,
            entryDate: true,
            supplier: {
              select: {
                name: true
              }
            }
          }
        }),
        prisma.sale.findMany({
          take: 5,
          orderBy: { saleDate: "desc" },
          select: {
            id: true,
            totalFinal: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        }),
        prisma.sale.findMany({
          where: {
            saleDate: {
              gte: subDays(now, 7)
            }
          },
          orderBy: {
            saleDate: "asc"
          },
          select: {
            saleDate: true,
            totalFinal: true
          }
        }),
        prisma.sale.groupBy({
          where: {
            saleDate: {
              gte: startOfMonth(now),
              lte: endOfMonth(now)
            }
          },
          by: ["paymentMethod"],
          _sum: {
            totalFinal: true
          },
          _count: {
            _all: true
          }
        }),
        prisma.$queryRaw<Array<{ supplier: string; total: number }>>`
          SELECT
            s.name AS supplier,
            COALESCE(SUM(si.subtotal), 0)::double precision AS total
          FROM "SaleItem" si
          INNER JOIN "Sale" sa ON sa.id = si."saleId"
          INNER JOIN "Product" p ON p.id = si."productId"
          INNER JOIN "Supplier" s ON s.id = p."supplierId"
          WHERE sa."saleDate" >= ${startOfMonth(now)} AND sa."saleDate" <= ${endOfMonth(now)}
          GROUP BY s.id, s.name
          ORDER BY total DESC
          LIMIT 8
        `
      ]);

    return {
      salesToday: Number(salesToday._sum.totalFinal ?? 0),
      salesMonth: Number(salesMonth._sum.totalFinal ?? 0),
      lowStock,
      latestEntries,
      latestSales,
      trend: trend.map((row) => ({
        date: row.saleDate.toISOString().slice(0, 10),
        total: Number(row.totalFinal)
      })),
      byPaymentMethod: byPaymentMethod.map((row) => ({
        method: row.paymentMethod,
        total: Number(row._sum.totalFinal ?? 0),
        count: row._count._all
      })),
      bySupplier: bySupplier.map((row) => ({
        supplier: row.supplier,
        total: Number(row.total)
      }))
    };
  },
  ["dashboard-metrics"],
  { tags: ["dashboard", "sales", "products", "inventory"] }
);

export async function getDashboardMetrics() {
  return getDashboardMetricsCached();
}
