import { prisma } from "@/db/prisma";
import { unstable_cache } from "next/cache";
import { format } from "date-fns";
import { endOfDay, endOfMonth, endOfYear, startOfDay, startOfMonth, startOfYear } from "date-fns";

export type MonthlySalesBySupplierReport = {
  monthLabel: string;
  suppliers: Array<{
    supplier: string;
    items: Array<{
      productName: string;
      quantity: number;
      total: number;
    }>;
    subtotal: number;
  }>;
  totalMonth: number;
};

export type CurrentStockBySupplierReport = {
  generatedAtLabel: string;
  suppliers: Array<{
    supplier: string;
    items: Array<{
      productName: string;
      stock: number;
      unitCost: number;
      totalCost: number;
    }>;
    subtotal: number;
  }>;
  totalInventoryCost: number;
};

export async function getSalesReport(period: "day" | "month" | "year", date = new Date()) {
  const dateKey = date.toISOString().slice(0, 10);
  return getSalesReportCached(period, dateKey);
}

const getSalesReportCached = unstable_cache(
  async (period: "day" | "month" | "year", dateKey: string) => {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
  const range =
    period === "day"
      ? { from: startOfDay(date), to: endOfDay(date) }
      : period === "month"
        ? { from: startOfMonth(date), to: endOfMonth(date) }
        : { from: startOfYear(date), to: endOfYear(date) };

  const sales = await prisma.sale.findMany({
    select: {
      id: true,
      saleDate: true,
      subtotal: true,
      discountAmount: true,
      totalFinal: true
    },
    where: {
      saleDate: {
        gte: range.from,
        lte: range.to
      }
    },
    orderBy: {
      saleDate: "asc"
    }
  });

  const total = sales.reduce((acc, sale) => acc + Number(sale.totalFinal), 0);
  return { range, total, sales };
  },
  ["reports-sales-range"],
  { tags: ["reports", "sales"] }
);

export async function getStockReport() {
  return getStockReportCached();
}

const getStockReportCached = unstable_cache(
  async () => {
    const products = await prisma.product.findMany({
      select: {
        name: true,
        costPrice: true,
        price: true,
        currentStock: true,
        supplier: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    const inventoryValue = products.reduce((sum, product) => {
      return sum + Number(product.costPrice) * product.currentStock;
    }, 0);

    return {
      products,
      inventoryValue
    };
  },
  ["reports-stock"],
  { tags: ["reports", "products"] }
);

export async function getTopProducts(limit = 10) {
  return getTopProductsCached(limit);
}

const getTopProductsCached = unstable_cache(
  async (limit: number) => {
    const grouped = await prisma.saleItem.groupBy({
      by: ["productId"],
      _sum: {
        quantity: true,
        subtotal: true
      },
      orderBy: {
        _sum: {
          quantity: "desc"
        }
      },
      take: limit
    });

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true
      },
      where: {
        id: {
          in: grouped.map((item) => item.productId)
        }
      }
    });

    return grouped.map((item) => ({
      product: products.find((product) => product.id === item.productId),
      quantity: item._sum.quantity ?? 0,
      subtotal: Number(item._sum.subtotal ?? 0)
    }));
  },
  ["reports-top-products"],
  { tags: ["reports", "sales", "products"] }
);

export async function getSalesBySupplier() {
  return getSalesBySupplierCached();
}

const getSalesBySupplierCached = unstable_cache(
  async () => {
  const rows = await prisma.$queryRaw<Array<{ supplier: string; total: number }>>`
    SELECT
      s.name AS supplier,
      COALESCE(SUM(si.subtotal), 0)::double precision AS total
    FROM "SaleItem" si
    INNER JOIN "Product" p ON p.id = si."productId"
    INNER JOIN "Supplier" s ON s.id = p."supplierId"
    GROUP BY s.id, s.name
    ORDER BY total DESC
  `;

  return rows.map((row) => ({
    supplier: row.supplier,
    total: Number(row.total)
  }));
  },
  ["reports-sales-by-supplier"],
  { tags: ["reports", "sales", "products", "suppliers"] }
);

export async function getBillingByCustomer() {
  return getBillingByCustomerCached();
}

const getBillingByCustomerCached = unstable_cache(
  async () => {
  const grouped = await prisma.sale.groupBy({
    by: ["customerId"],
    _sum: {
      totalFinal: true
    },
    _count: {
      id: true
    },
    orderBy: {
      _sum: {
        totalFinal: "desc"
      }
    }
  });

  const customerIds = grouped
    .map((row) => row.customerId)
    .filter((customerId): customerId is string => Boolean(customerId));

  const customers = customerIds.length
    ? await prisma.customer.findMany({
        where: {
          id: {
            in: customerIds
          }
        },
        select: {
          id: true,
          name: true
        }
      })
    : [];

  const customerMap = new Map(customers.map((customer) => [customer.id, customer.name]));

    return grouped.map((row) => ({
      customer: row.customerId ? (customerMap.get(row.customerId) ?? "Cliente") : "Cliente general",
      total: Number(row._sum.totalFinal ?? 0),
      invoices: row._count.id
    }));
  },
  ["reports-billing-by-customer"],
  { tags: ["reports", "sales", "invoices", "customers"] }
);

export async function getMonthlySalesBySupplierReport(date = new Date()): Promise<MonthlySalesBySupplierReport> {
  const dateKey = date.toISOString().slice(0, 10);
  return getMonthlySalesBySupplierReportCached(dateKey);
}

const getMonthlySalesBySupplierReportCached = unstable_cache(
  async (dateKey: string): Promise<MonthlySalesBySupplierReport> => {
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    const from = startOfMonth(date);
    const to = endOfMonth(date);

    const rows = await prisma.$queryRaw<
      Array<{
        supplier: string;
        productName: string;
        quantity: number;
        total: number;
      }>
    >`
      SELECT
        s.name AS supplier,
        p.name AS "productName",
        COALESCE(SUM(si.quantity), 0)::integer AS quantity,
        COALESCE(SUM(si.subtotal), 0)::double precision AS total
      FROM "SaleItem" si
      INNER JOIN "Sale" sa ON sa.id = si."saleId"
      INNER JOIN "Product" p ON p.id = si."productId"
      INNER JOIN "Supplier" s ON s.id = p."supplierId"
      WHERE sa."saleDate" >= ${from} AND sa."saleDate" <= ${to}
      GROUP BY s.id, s.name, p.id, p.name
      ORDER BY s.name ASC, total DESC
    `;

    const supplierMap = new Map<
      string,
      {
        supplier: string;
        items: Array<{ productName: string; quantity: number; total: number }>;
        subtotal: number;
      }
    >();

    for (const row of rows) {
      const current = supplierMap.get(row.supplier) ?? {
        supplier: row.supplier,
        items: [],
        subtotal: 0
      };

      const itemTotal = Number(row.total ?? 0);
      current.items.push({
        productName: row.productName,
        quantity: Number(row.quantity ?? 0),
        total: itemTotal
      });
      current.subtotal += itemTotal;

      supplierMap.set(row.supplier, current);
    }

    const suppliers = [...supplierMap.values()].sort((a, b) => b.subtotal - a.subtotal);
    const totalMonth = suppliers.reduce((sum, supplier) => sum + supplier.subtotal, 0);

    return {
      monthLabel: format(date, "MM/yyyy"),
      suppliers,
      totalMonth
    };
  },
  ["reports-monthly-sales-by-supplier"],
  { tags: ["reports", "sales", "suppliers", "products"] }
);

export async function getCurrentStockBySupplierReport(): Promise<CurrentStockBySupplierReport> {
  return getCurrentStockBySupplierReportCached();
}

const getCurrentStockBySupplierReportCached = unstable_cache(
  async (): Promise<CurrentStockBySupplierReport> => {
    const products = await prisma.product.findMany({
      select: {
        name: true,
        currentStock: true,
        costPrice: true,
        supplier: {
          select: {
            name: true
          }
        }
      },
      orderBy: [{ supplier: { name: "asc" } }, { name: "asc" }]
    });

    const supplierMap = new Map<
      string,
      {
        supplier: string;
        items: Array<{ productName: string; stock: number; unitCost: number; totalCost: number }>;
        subtotal: number;
      }
    >();

    for (const product of products) {
      const supplierName = product.supplier.name;
      const stock = Number(product.currentStock ?? 0);
      const unitCost = Number(product.costPrice ?? 0);
      const totalCost = stock * unitCost;

      const current = supplierMap.get(supplierName) ?? {
        supplier: supplierName,
        items: [],
        subtotal: 0
      };

      current.items.push({
        productName: product.name,
        stock,
        unitCost,
        totalCost
      });
      current.subtotal += totalCost;

      supplierMap.set(supplierName, current);
    }

    const suppliers = [...supplierMap.values()].sort((a, b) => a.supplier.localeCompare(b.supplier));
    const totalInventoryCost = suppliers.reduce((sum, supplier) => sum + supplier.subtotal, 0);

    return {
      generatedAtLabel: format(new Date(), "dd/MM/yyyy"),
      suppliers,
      totalInventoryCost
    };
  },
  ["reports-current-stock-by-supplier"],
  { tags: ["reports", "products", "suppliers"] }
);
