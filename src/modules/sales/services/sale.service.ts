import { DiscountType, Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/db/prisma";
import { createInvoiceForSale } from "@/modules/invoices/services/invoice.service";
import { CustomerInput } from "@/modules/customers/schemas/customer.schema";
import { CreateSaleInput } from "@/modules/sales/schemas/sale.schema";
import { DiscountCalculation } from "@/modules/sales/types/discount";

export function calculateDiscount(subtotal: number, discountType: DiscountType, discountValue: number): DiscountCalculation {
  if (discountType === "NONE") {
    return {
      subtotal,
      discountType,
      discountValue: 0,
      discountAmount: 0,
      totalFinal: subtotal
    };
  }

  const discountAmount =
    discountType === "PERCENTAGE"
      ? Number((subtotal * (discountValue / 100)).toFixed(2))
      : Number(discountValue.toFixed(2));

  const clamped = Math.min(discountAmount, subtotal);
  return {
    subtotal,
    discountType,
    discountValue,
    discountAmount: clamped,
    totalFinal: Number((subtotal - clamped).toFixed(2))
  };
}

async function getOrCreateCustomer(tx: Prisma.TransactionClient, customer?: CustomerInput) {
  if (!customer) {
    return null;
  }

  return tx.customer.upsert({
    where: { documentId: customer.documentId },
    update: {
      name: customer.name,
      email: customer.email || null
    },
    create: {
      name: customer.name,
      documentId: customer.documentId,
      email: customer.email || null
    }
  });
}

export async function registerSale(data: CreateSaleInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const productIds = data.items.map((item) => item.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        currentStock: true
      }
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    const variantIds = data.items
      .map((item) => item.variantId)
      .filter((variantId): variantId is string => Boolean(variantId));

    const variants = variantIds.length
      ? await tx.productVariant.findMany({
          where: {
            id: {
              in: variantIds
            }
          },
          select: {
            id: true,
            productId: true,
            name: true,
            value: true,
            stock: true
          }
        })
      : [];

    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Producto no encontrado: ${item.productId}`);
      }

      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant || variant.productId !== item.productId) {
          throw new Error(`Variante invalida para ${product.name}`);
        }

        if (variant.stock < item.quantity) {
          throw new Error(`Stock insuficiente para ${product.name} (${variant.name} ${variant.value})`);
        }
      }

      if (product.currentStock < item.quantity) {
        throw new Error(`Stock insuficiente para ${product.name}`);
      }
    }

    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discount = calculateDiscount(subtotal, data.discountType, data.discountValue);

    const customer = await getOrCreateCustomer(tx, data.customer);

    const sale = await tx.sale.create({
      data: {
        userId,
        customerId: customer?.id,
        subtotal: discount.subtotal,
        discountType: data.discountType,
        paymentMethod: data.paymentMethod,
        discountValue: discount.discountValue,
        discountAmount: discount.discountAmount,
        totalFinal: discount.totalFinal,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice
          }))
        }
      },
      include: {
        items: true,
        invoice: true
      }
    });

    const productUpdates = data.items.map((item) =>
      tx.product.update({
        where: { id: item.productId },
        data: {
          currentStock: {
            decrement: item.quantity
          }
        }
      })
    );

    const variantUpdates = data.items
      .filter((item): item is (typeof data.items)[number] & { variantId: string } => Boolean(item.variantId))
      .map((item) =>
        tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        })
      );

    await Promise.all([...productUpdates, ...variantUpdates]);

    let invoice = null;
    if (data.generateInvoice) {
      invoice = await createInvoiceForSale(sale.id, customer?.id, tx);
    }

    return {
      ...sale,
      invoice
    };
  });
}

const listSalesPaginatedCached = unstable_cache(
  async (
    page: number,
    pageSize: number,
    saleDateKey?: string,
    customerQuery?: string,
    paymentMethod?: "EFECTIVO" | "TARJETA"
  ) => {
    const where: Prisma.SaleWhereInput = {};

    if (saleDateKey) {
      const date = new Date(`${saleDateKey}T00:00:00`);
      if (!Number.isNaN(date.getTime())) {
        where.saleDate = {
          gte: startOfDay(date),
          lte: endOfDay(date)
        };
      }
    }

    if (customerQuery) {
      where.customer = {
        name: {
          contains: customerQuery,
          mode: "insensitive"
        }
      };
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    const [items, total] = await Promise.all([
      prisma.sale.findMany({
        select: {
          id: true,
          saleDate: true,
          subtotal: true,
          discountType: true,
          paymentMethod: true,
          discountValue: true,
          discountAmount: true,
          totalFinal: true,
          customer: {
            select: {
              name: true,
              documentId: true,
              email: true
            }
          },
          invoice: {
            select: {
              id: true
            }
          },
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              subtotal: true,
              product: {
                select: {
                  name: true
                }
              },
              variant: {
                select: {
                  name: true,
                  value: true
                }
              }
            }
          }
        },
        where,
        orderBy: {
          saleDate: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.sale.count({ where })
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  },
  ["sales-paginated"],
  { tags: ["sales"] }
);

export async function listSalesPaginated(params?: {
  page?: number;
  pageSize?: number;
  saleDate?: string;
  customer?: string;
  paymentMethod?: string;
}) {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 25));
  const saleDateKey = params?.saleDate?.trim() || undefined;
  const customerQuery = params?.customer?.trim() || undefined;
  const paymentMethod =
    params?.paymentMethod === "EFECTIVO" || params?.paymentMethod === "TARJETA"
      ? params.paymentMethod
      : undefined;

  return listSalesPaginatedCached(page, pageSize, saleDateKey, customerQuery, paymentMethod);
}

export async function listSales() {
  return prisma.sale.findMany({
    select: {
      id: true,
      saleDate: true,
      subtotal: true,
      discountType: true,
      paymentMethod: true,
      discountValue: true,
      discountAmount: true,
      totalFinal: true,
      customer: {
        select: {
          name: true,
          documentId: true,
          email: true
        }
      },
      invoice: {
        select: {
          id: true
        }
      },
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          subtotal: true,
          product: {
            select: {
              name: true
            }
          },
          variant: {
            select: {
              name: true,
              value: true
            }
          }
        }
      }
    },
    orderBy: {
      saleDate: "desc"
    }
  });
}

export async function updateSaleDiscount(
  id: string,
  discountType: DiscountType,
  discountValue: number
) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    select: {
      subtotal: true
    }
  });

  if (!sale) {
    throw new Error("Venta no encontrada");
  }

  const discount = calculateDiscount(Number(sale.subtotal), discountType, discountValue);

  return prisma.sale.update({
    where: { id },
    data: {
      discountType,
      discountValue: discount.discountValue,
      discountAmount: discount.discountAmount,
      totalFinal: discount.totalFinal
    }
  });
}

export async function deleteSale(id: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id },
      include: {
        items: true,
        invoice: true
      }
    });

    if (!sale) {
      throw new Error("Venta no encontrada");
    }

    const saleItems = sale.items;

    // Use updateMany per item so no crash if the product/variant was already deleted
    await Promise.all([
      ...saleItems.map((item) =>
        tx.product.updateMany({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } }
        })
      ),
      ...saleItems
        .filter((item) => Boolean(item.variantId))
        .map((item) =>
          tx.productVariant.updateMany({
            where: { id: item.variantId! },
            data: { stock: { increment: item.quantity } }
          })
        )
    ]);

    if (sale.invoice) {
      await tx.invoice.delete({ where: { id: sale.invoice.id } });
    }

    await tx.sale.delete({ where: { id } });
  });
}
