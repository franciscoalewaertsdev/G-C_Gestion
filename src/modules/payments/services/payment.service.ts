import { format } from "date-fns";
import { es } from "date-fns/locale";
import { unstable_cache } from "next/cache";
import { prisma } from "@/db/prisma";

export type MonthlySupplierPaymentReport = {
  supplierId: string;
  supplierName: string;
  year: number;
  month: number;
  monthLabel: string;
  albaranes: string[];
  items: Array<{
    quantity: number;
    productName: string;
    productCode: string | null;
    unitPrice: number;
    totalPrice: number;
  }>;
  payableAtCost: number;
  totalSales: number;
};

export type MonthlySupplierPayment = {
  key: string;
  supplierId: string;
  supplierName: string;
  year: number;
  month: number;
  monthLabel: string;
  albaranes: string[];
  payableAtCost: number;
  totalSales: number;
  isPaid: boolean;
};

export async function getMonthlySupplierPayments() {
  return getMonthlySupplierPaymentsCached();
}

const getMonthlySupplierPaymentsCached = unstable_cache(
  async () => {
    const sales = await prisma.sale.findMany({
      orderBy: {
        saleDate: "desc"
      },
      select: {
        id: true,
        saleDate: true,
        invoice: {
          select: {
            invoiceNumber: true
          }
        },
        items: {
          select: {
            quantity: true,
            subtotal: true,
            product: {
              select: {
                costPrice: true,
                supplierId: true,
                supplier: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const rows = new Map<string, MonthlySupplierPayment>();

    for (const sale of sales) {
      const year = sale.saleDate.getFullYear();
      const month = sale.saleDate.getMonth() + 1;

      for (const item of sale.items) {
        const supplierId = item.product.supplierId;
        const key = `${year}-${String(month).padStart(2, "0")}-${supplierId}`;
        const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es });

        const existing = rows.get(key) ?? {
          key,
          supplierId,
          supplierName: item.product.supplier.name,
          year,
          month,
          monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          albaranes: [],
          payableAtCost: 0,
          totalSales: 0,
          isPaid: false
        };

        existing.payableAtCost += Number(item.product.costPrice) * item.quantity;
        existing.totalSales += Number(item.subtotal);

        const invoiceNumber = sale.invoice?.invoiceNumber;
        if (invoiceNumber && !existing.albaranes.includes(invoiceNumber)) {
          existing.albaranes.push(invoiceNumber);
        }

        rows.set(key, existing);
      }
    }

    const groups = [...rows.values()];
    if (groups.length === 0) {
      return [];
    }

    const statuses = await prisma.supplierMonthlyPayment.findMany({
      where: {
        OR: groups.map((row) => ({
          supplierId: row.supplierId,
          year: row.year,
          month: row.month
        }))
      },
      select: {
        supplierId: true,
        year: true,
        month: true,
        isPaid: true
      }
    });

    const statusMap = new Map(
      statuses.map((item) => [`${item.year}-${String(item.month).padStart(2, "0")}-${item.supplierId}`, item.isPaid])
    );

    for (const row of groups) {
      row.isPaid = statusMap.get(row.key) ?? false;
    }

    return groups.sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year;
      }

      if (a.month !== b.month) {
        return b.month - a.month;
      }

      return a.supplierName.localeCompare(b.supplierName, "es");
    });
  },
  ["payments-monthly-suppliers"],
  { tags: ["payments", "sales", "suppliers"] }
);

export async function getMonthlySupplierPaymentReport(supplierId: string, year: number, month: number) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, name: true }
  });

  if (!supplier) {
    return null;
  }

  const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, month, 0, 23, 59, 59, 999);

  const sales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: from,
        lte: to
      },
      items: {
        some: {
          product: {
            supplierId
          }
        }
      }
    },
    orderBy: {
      saleDate: "asc"
    },
    select: {
      id: true,
      saleDate: true,
      invoice: {
        select: {
          invoiceNumber: true
        }
      },
      items: {
        where: {
          product: {
            supplierId
          }
        },
        select: {
          quantity: true,
          subtotal: true,
          product: {
            select: {
              name: true,
              barcode: true,
              costPrice: true
            }
          }
        }
      }
    }
  });

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es });
  const albaranSet = new Set<string>();

  const itemMap = new Map<
    string,
    { quantity: number; productName: string; productCode: string | null; unitPrice: number; totalPrice: number }
  >();
  let payableAtCost = 0;
  let totalSales = 0;

  for (const sale of sales) {
    const invoiceNumber = sale.invoice?.invoiceNumber;
    if (invoiceNumber) {
      albaranSet.add(invoiceNumber);
    }

    for (const item of sale.items) {
      const unitPrice = Number(item.product.costPrice);
      const totalPrice = unitPrice * item.quantity;
      const productCode = item.product.barcode?.trim() || null;
      const itemKey = `${item.product.name}::${productCode ?? "-"}::${unitPrice.toFixed(2)}`;
      const existing = itemMap.get(itemKey) ?? {
        quantity: 0,
        productName: item.product.name,
        productCode,
        unitPrice,
        totalPrice: 0
      };

      existing.quantity += item.quantity;
      existing.totalPrice += totalPrice;
      itemMap.set(itemKey, existing);

      payableAtCost += totalPrice;
      totalSales += Number(item.subtotal);
    }
  }

  const items = [...itemMap.values()].sort((a, b) => a.productName.localeCompare(b.productName, "es"));

  const report: MonthlySupplierPaymentReport = {
    supplierId: supplier.id,
    supplierName: supplier.name,
    year,
    month,
    monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    albaranes: [...albaranSet],
    items,
    payableAtCost,
    totalSales
  };

  return report;
}
