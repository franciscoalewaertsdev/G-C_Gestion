import { prisma } from "@/db/prisma";
import { ProductForm } from "@/modules/products/components/product-form";
import { ProductsTable } from "@/modules/products/components/products-table";
import { SizesManager } from "@/modules/products/components/sizes-manager";
import { listProducts } from "@/modules/products/services/product.service";
import { listGlobalSizes } from "@/modules/products/services/size.service";

export default async function ProductsPage() {
  const [products, suppliers, globalSizes] = await Promise.all([
    listProducts(),
    prisma.supplier.findMany({
      where: {
        OR: [{ email: null }, { email: { not: "deleted-supplier@system.local" } }]
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    listGlobalSizes()
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Productos</h2>
        <SizesManager initialSizes={globalSizes} />
      </div>
      <ProductForm suppliers={suppliers} globalSizes={globalSizes} />
      <ProductsTable
        data={products.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          costPrice: Number(item.costPrice),
          price: Number(item.price),
          currentStock: item.currentStock,
          lowStockAlert: item.lowStockAlert,
          supplier: item.supplier.name,
          variants: item.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            value: variant.value,
            stock: variant.stock
          }))
        }))}
      />
    </div>
  );
}
