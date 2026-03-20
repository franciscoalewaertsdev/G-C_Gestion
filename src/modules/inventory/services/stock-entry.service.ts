import { prisma } from "@/db/prisma";
import { unstable_cache } from "next/cache";
import { CreateStockEntryInput } from "@/modules/inventory/schemas/stock-entry.schema";

function buildQuantityMap(items: Array<{ id: string; quantity: number }>) {
  const quantityMap = new Map<string, number>();
  for (const item of items) {
    quantityMap.set(item.id, (quantityMap.get(item.id) ?? 0) + item.quantity);
  }

  return quantityMap;
}

export async function registerStockEntry(data: CreateStockEntryInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const productIds = [...new Set(data.items.map((item) => item.productId))];
    const variantIds = [...new Set(data.items.map((item) => item.variantId).filter((id): id is string => Boolean(id)))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, costPrice: true }
    });
    const variants = variantIds.length
      ? await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, productId: true }
        })
      : [];

    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    const costPriceByProductId = new Map(products.map((product) => [product.id, product.costPrice]));

    if (costPriceByProductId.size !== productIds.length) {
      throw new Error("Uno o mas productos no existen.");
    }

    for (const item of data.items) {
      if (!item.variantId) {
        continue;
      }

      const variant = variantById.get(item.variantId);
      if (!variant || variant.productId !== item.productId) {
        throw new Error("La variante seleccionada no pertenece al producto.");
      }
    }

    const stockEntry = await tx.stockEntry.create({
      data: {
        supplierId: data.supplierId,
        userId,
        entryDate: data.entryDate ?? new Date(),
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            unitCost: costPriceByProductId.get(item.productId)
          }))
        }
      },
      include: { items: true }
    });

    // Aggregate quantities per unique product to minimise UPDATE statements
    const productQtyMap = new Map<string, number>();
    for (const item of data.items) {
      productQtyMap.set(item.productId, (productQtyMap.get(item.productId) ?? 0) + item.quantity);
    }
    for (const [productId, totalQty] of productQtyMap) {
      await tx.product.updateMany({
        where: { id: productId },
        data: { currentStock: { increment: totalQty } }
      });
    }

    // Aggregate quantities per unique variant
    const variantQtyMap = new Map<string, number>();
    for (const item of data.items) {
      if (item.variantId) {
        variantQtyMap.set(item.variantId, (variantQtyMap.get(item.variantId) ?? 0) + item.quantity);
      }
    }
    for (const [variantId, totalQty] of variantQtyMap) {
      await tx.productVariant.updateMany({
        where: { id: variantId },
        data: { stock: { increment: totalQty } }
      });
    }

    return stockEntry;
  }, { timeout: 30000 });
}

export async function listStockEntries() {
  return prisma.stockEntry.findMany({
    select: {
      id: true,
      entryDate: true,
      supplier: {
        select: {
          name: true
        }
      },
      _count: {
        select: {
          items: true
        }
      }
    },
    orderBy: { entryDate: "desc" }
  });
}

const listStockEntriesPaginatedCached = unstable_cache(
  async (page: number, pageSize: number, supplierId?: string) => {
    const where = supplierId
      ? {
          supplierId
        }
      : undefined;

    const [items, total] = await Promise.all([
      prisma.stockEntry.findMany({
        select: {
          id: true,
          entryDate: true,
          supplier: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              items: true
            }
          }
        },
        where,
        orderBy: { entryDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.stockEntry.count({ where })
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  },
  ["inventory-paginated"],
  { tags: ["inventory"] }
);

export async function listStockEntriesPaginated(params?: { page?: number; pageSize?: number; supplierId?: string }) {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 25));
  const supplierId = params?.supplierId?.trim() || undefined;

  return listStockEntriesPaginatedCached(page, pageSize, supplierId);
}

export async function getStockEntryById(id: string) {
  return prisma.stockEntry.findUnique({
    where: { id },
    include: {
      supplier: true,
      user: true,
      items: {
        include: {
          product: true
        }
      }
    }
  });
}

export async function getStockEntryNotesById(id: string) {
  return prisma.stockEntry.findUnique({
    where: { id },
    select: {
      id: true,
      notes: true
    }
  });
}

export async function getStockEntryForEdit(id: string) {
  return prisma.stockEntry.findUnique({
    where: { id },
    select: {
      id: true,
      supplierId: true,
      entryDate: true,
      notes: true,
      items: {
        select: {
          productId: true,
          variantId: true,
          quantity: true
        }
      }
    }
  });
}

export async function updateStockEntryNotes(id: string, notes: string) {
  return prisma.stockEntry.update({
    where: { id },
    data: {
      notes
    }
  });
}

export async function updateStockEntry(id: string, data: CreateStockEntryInput) {
  return prisma.$transaction(async (tx) => {
    const existingEntry = await tx.stockEntry.findUnique({
      where: { id },
      select: {
        id: true,
        items: {
          select: {
            productId: true,
            variantId: true,
            quantity: true
          }
        }
      }
    });

    if (!existingEntry) {
      throw new Error("Ingreso no encontrado.");
    }

    const productIds = [...new Set(data.items.map((item) => item.productId))];
    const variantIds = [...new Set(data.items.map((item) => item.variantId).filter((id): id is string => Boolean(id)))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, costPrice: true }
    });
    const variants = variantIds.length
      ? await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, productId: true }
        })
      : [];

    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    const costPriceByProductId = new Map(products.map((product) => [product.id, product.costPrice]));

    if (costPriceByProductId.size !== productIds.length) {
      throw new Error("Uno o mas productos no existen.");
    }

    for (const item of data.items) {
      if (!item.variantId) {
        continue;
      }

      const variant = variantById.get(item.variantId);
      if (!variant || variant.productId !== item.productId) {
        throw new Error("La variante seleccionada no pertenece al producto.");
      }
    }

    const oldProductQtyMap = buildQuantityMap(
      existingEntry.items.map((item) => ({ id: item.productId, quantity: item.quantity }))
    );
    const newProductQtyMap = buildQuantityMap(data.items.map((item) => ({ id: item.productId, quantity: item.quantity })));
    const oldVariantQtyMap = buildQuantityMap(
      existingEntry.items
        .filter((item): item is typeof item & { variantId: string } => Boolean(item.variantId))
        .map((item) => ({ id: item.variantId, quantity: item.quantity }))
    );
    const newVariantQtyMap = buildQuantityMap(
      data.items
        .filter((item): item is CreateStockEntryInput["items"][number] & { variantId: string } => Boolean(item.variantId))
        .map((item) => ({ id: item.variantId, quantity: item.quantity }))
    );

    const allProductIds = new Set([...oldProductQtyMap.keys(), ...newProductQtyMap.keys()]);
    for (const productId of allProductIds) {
      const oldQty = oldProductQtyMap.get(productId) ?? 0;
      const newQty = newProductQtyMap.get(productId) ?? 0;
      const diff = newQty - oldQty;

      if (diff !== 0) {
        await tx.product.updateMany({
          where: { id: productId },
          data: { currentStock: { increment: diff } }
        });
      }
    }

    const allVariantIds = new Set([...oldVariantQtyMap.keys(), ...newVariantQtyMap.keys()]);
    for (const variantId of allVariantIds) {
      const oldQty = oldVariantQtyMap.get(variantId) ?? 0;
      const newQty = newVariantQtyMap.get(variantId) ?? 0;
      const diff = newQty - oldQty;

      if (diff !== 0) {
        await tx.productVariant.updateMany({
          where: { id: variantId },
          data: { stock: { increment: diff } }
        });
      }
    }

    await tx.stockEntry.update({
      where: { id },
      data: {
        supplierId: data.supplierId,
        entryDate: data.entryDate ?? new Date(),
        notes: data.notes,
        items: {
          deleteMany: {},
          create: data.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            unitCost: costPriceByProductId.get(item.productId)
          }))
        }
      }
    });
  }, { timeout: 30000 });
}

export async function deleteStockEntry(id: string) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.stockEntry.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!entry) {
      throw new Error("Ingreso no encontrado");
    }

    await Promise.all([
      ...entry.items.map((item) =>
        tx.product.updateMany({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } }
        })
      ),
      ...entry.items
        .filter((item) => Boolean(item.variantId))
        .map((item) =>
          tx.productVariant.updateMany({
            where: { id: item.variantId! },
            data: { stock: { decrement: item.quantity } }
          })
        )
    ]);

    await tx.stockEntry.delete({ where: { id } });
  });
}
