import { prisma } from "@/db/prisma";
import { Prisma } from "@prisma/client";
import { CreateSupplierInput } from "@/modules/suppliers/schemas/supplier.schema";

const FALLBACK_SUPPLIER_NAME = "Proveedor eliminado";
const FALLBACK_SUPPLIER_EMAIL = "deleted-supplier@system.local";

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

export async function listSuppliers() {
  return prisma.supplier.findMany({
    where: {
      OR: [{ email: null }, { email: { not: FALLBACK_SUPPLIER_EMAIL } }]
    },
    include: {
      products: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function createSupplier(data: CreateSupplierInput) {
  return prisma.supplier.create({
    data: {
      ...data,
      email: data.email || null
    }
  });
}

export async function updateSupplier(
  id: string,
  data: Partial<Pick<CreateSupplierInput, "name" | "contactName" | "email" | "phone" | "address">>
) {
  return prisma.supplier.update({
    where: { id },
    data: {
      name: data.name,
      contactName: data.contactName,
      email: data.email || null,
      phone: data.phone,
      address: data.address
    }
  });
}

export async function deleteSupplier(id: string) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new Error("Proveedor no encontrado");
    }

    const [productRefs, stockEntryRefs] = await Promise.all([
      tx.product.count({ where: { supplierId: id } }),
      tx.stockEntry.count({ where: { supplierId: id } })
    ]);

    const hasReferences = productRefs > 0 || stockEntryRefs > 0;

    if (supplier.email === FALLBACK_SUPPLIER_EMAIL && hasReferences) {
      throw new Error("No se puede eliminar el proveedor eliminado porque tiene historial asociado.");
    }

    if (hasReferences) {
      const fallbackSupplier = await ensureFallbackSupplier(tx);

      await tx.product.updateMany({
        where: { supplierId: id },
        data: { supplierId: fallbackSupplier.id }
      });

      await tx.stockEntry.updateMany({
        where: { supplierId: id },
        data: { supplierId: fallbackSupplier.id }
      });
    }

    await tx.supplier.delete({ where: { id } });
  });
}
