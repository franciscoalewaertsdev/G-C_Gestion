import { prisma } from "@/db/prisma";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { CreateProductInput, UpdateProductInput } from "@/modules/products/schemas/product.schema";

const FALLBACK_SUPPLIER_NAME = "Proveedor eliminado";
const FALLBACK_SUPPLIER_EMAIL = "deleted-supplier@system.local";
const FALLBACK_PRODUCT_BARCODE = "DELETED-PRODUCT-SYSTEM";

function normalizeBarcode(barcode?: string) {
  const normalized = barcode?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function mapPrismaProductError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta?.target : [];
    if (target.includes("barcode")) {
      throw new Error("El codigo de barras ya existe. Ingresa uno diferente o dejalo vacio.");
    }
  }

  throw error;
}

async function ensureFallbackSupplier(tx: Prisma.TransactionClient | typeof prisma) {
  const existing = await tx.supplier.findFirst({
    where: {
      email: FALLBACK_SUPPLIER_EMAIL
    }
  });

  if (existing) {
    return existing;
  }

  return tx.supplier.create({
    data: {
      name: FALLBACK_SUPPLIER_NAME,
      email: FALLBACK_SUPPLIER_EMAIL,
      contactName: "Sistema"
    }
  });
}

async function ensureFallbackProduct(tx: Prisma.TransactionClient | typeof prisma) {
  const existing = await tx.product.findFirst({
    where: {
      barcode: FALLBACK_PRODUCT_BARCODE
    }
  });

  if (existing) {
    return existing;
  }

  const fallbackSupplier = await ensureFallbackSupplier(tx);

  return tx.product.create({
    data: {
      name: "Producto eliminado",
      description: "Producto tecnico para conservar historial de ventas e ingresos.",
      barcode: FALLBACK_PRODUCT_BARCODE,
      costPrice: 0,
      price: 0,
      currentStock: 0,
      lowStockAlert: 0,
      supplierId: fallbackSupplier.id
    }
  });
}

export async function listProducts(search?: string) {
  const where = search
    ? {
        OR: [{ name: { contains: search, mode: "insensitive" as const } }, { barcode: { contains: search } }]
      }
    : undefined;

  return prisma.product.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      barcode: true,
      costPrice: true,
      price: true,
      currentStock: true,
      lowStockAlert: true,
      supplier: {
        select: {
          id: true,
          name: true
        }
      },
      variants: {
        select: {
          id: true,
          name: true,
          value: true,
          stock: true
        },
        orderBy: {
          value: "asc"
        }
      }
    },
    where,
    orderBy: {
      createdAt: "desc"
    }
  });
}

const listProductsPaginatedCached = unstable_cache(
  async (search: string | undefined, page: number, pageSize: number) => {
    const where = search
      ? {
          OR: [{ name: { contains: search, mode: "insensitive" as const } }, { barcode: { contains: search } }]
        }
      : undefined;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          barcode: true,
          costPrice: true,
          price: true,
          currentStock: true,
          lowStockAlert: true,
          supplier: {
            select: {
              id: true,
              name: true
            }
          },
          variants: {
            select: {
              id: true,
              name: true,
              value: true,
              stock: true
            },
            orderBy: {
              value: "asc"
            }
          }
        },
        where,
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.product.count({ where })
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  },
  ["products-paginated"],
  { tags: ["products"] }
);

const listProductsForSaleFormCached = unstable_cache(
  async () =>
    prisma.product.findMany({
    select: {
      id: true,
      name: true,
      barcode: true,
      price: true,
      currentStock: true,
      supplier: {
        select: {
          id: true,
          name: true
        }
      },
      variants: {
        select: {
          id: true,
          name: true,
          value: true,
          stock: true
        },
        orderBy: {
          value: "asc"
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  }),
  ["products-sale-form"],
  { tags: ["products"] }
);

export async function listProductsPaginated(params?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 25));
  const search = params?.search?.trim() || undefined;

  return listProductsPaginatedCached(search, page, pageSize);
}

export async function listProductsForSaleForm() {
  return listProductsForSaleFormCached();
}

export async function createProduct(data: CreateProductInput) {
  try {
    return await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        barcode: normalizeBarcode(data.barcode),
        costPrice: data.costPrice,
        price: data.price,
        currentStock: data.currentStock,
        lowStockAlert: data.lowStockAlert,
        supplierId: data.supplierId,
        variants: {
          create: data.variants
        }
      },
      include: {
        supplier: true,
        variants: true
      }
    });
  } catch (error) {
    mapPrismaProductError(error);
  }
}

export async function updateProduct(data: UpdateProductInput) {
  try {
    return await prisma.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        barcode: normalizeBarcode(data.barcode),
        costPrice: data.costPrice,
        price: data.price,
        currentStock: data.currentStock,
        lowStockAlert: data.lowStockAlert,
        supplierId: data.supplierId,
        variants: {
          deleteMany: {},
          create: data.variants
        }
      }
    });
  } catch (error) {
    mapPrismaProductError(error);
  }
}

export async function deleteProduct(id: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id } });
    if (!product) {
      throw new Error("Producto no encontrado");
    }

    const [stockEntryRefs, saleRefs] = await Promise.all([
      tx.stockEntryItem.count({ where: { productId: id } }),
      tx.saleItem.count({ where: { productId: id } })
    ]);

    const hasReferences = stockEntryRefs > 0 || saleRefs > 0;

    if (product.barcode === FALLBACK_PRODUCT_BARCODE && hasReferences) {
      throw new Error("No se puede eliminar el producto eliminado porque tiene historial asociado.");
    }

    if (hasReferences) {
      const fallbackProduct = await ensureFallbackProduct(tx);

      await tx.stockEntryItem.updateMany({
        where: { productId: id },
        data: { productId: fallbackProduct.id }
      });

      await tx.saleItem.updateMany({
        where: { productId: id },
        data: { productId: fallbackProduct.id }
      });
    }

    await tx.product.delete({ where: { id } });
  });
}

export async function updateProductBasic(
  id: string,
  data: {
    name: string;
    description?: string;
    costPrice: number;
    price: number;
    currentStock: number;
    lowStockAlert: number;
    variantStocks?: Array<{ id: string; stock: number }>;
  }
) {
  return prisma.$transaction(async (tx) => {
    if (data.variantStocks && data.variantStocks.length > 0) {
      await Promise.all(
        data.variantStocks.map((variant) =>
          tx.productVariant.update({
            where: { id: variant.id },
            data: {
              stock: variant.stock
            }
          })
        )
      );

      const stockFromVariants = data.variantStocks.reduce((sum, variant) => sum + variant.stock, 0);

      return tx.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description || null,
          costPrice: data.costPrice,
          price: data.price,
          currentStock: stockFromVariants,
          lowStockAlert: data.lowStockAlert
        }
      });
    }

    return tx.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null,
        costPrice: data.costPrice,
        price: data.price,
        currentStock: data.currentStock,
        lowStockAlert: data.lowStockAlert
      }
    });
  });
}

export async function getProductStockHistory(productId: string) {
  const [entries, sales] = await Promise.all([
    prisma.stockEntryItem.findMany({
      where: { productId },
      include: {
        stockEntry: {
          include: { supplier: true, user: true }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.saleItem.findMany({
      where: { productId },
      include: {
        sale: {
          include: { user: true, customer: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const entryHistory = entries.map((entry) => ({
    type: "ENTRY",
    date: entry.createdAt,
    quantity: entry.quantity,
    actor: entry.stockEntry.user.fullName,
    reference: entry.stockEntry.id
  }));

  const saleHistory = sales.map((sale) => ({
    type: "SALE",
    date: sale.createdAt,
    quantity: -sale.quantity,
    actor: sale.sale.user.fullName,
    reference: sale.sale.id
  }));

  return [...entryHistory, ...saleHistory].sort((a, b) => b.date.getTime() - a.date.getTime());
}
