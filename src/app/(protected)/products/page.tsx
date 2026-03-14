import { prisma } from "@/db/prisma";
import { ProductForm } from "@/modules/products/components/product-form";
import { ProductsTable } from "@/modules/products/components/products-table";
import { listProductsPaginated } from "@/modules/products/services/product.service";

type ProductsPageProps = {
  searchParams?: {
    page?: string;
    pageSize?: string;
    q?: string;
  };
};

function getPositiveInt(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const page = getPositiveInt(searchParams?.page, 1, 100000);
  const pageSize = getPositiveInt(searchParams?.pageSize, 25, 100);
  const q = searchParams?.q?.trim() || undefined;

  const [productsResult, suppliers] = await Promise.all([
    listProductsPaginated({ page, pageSize, search: q }),
    prisma.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);

  const makeHref = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("pageSize", String(productsResult.pageSize));
    if (q) {
      params.set("q", q);
    }
    return `/products?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Productos</h2>
      <ProductForm suppliers={suppliers} />
      <form className="flex flex-wrap items-center gap-2" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre o codigo de barras"
          className="h-10 w-full max-w-sm rounded-md border border-slate-300 px-3 text-sm"
        />
        <select
          name="pageSize"
          defaultValue={String(productsResult.pageSize)}
          className="h-10 rounded-md border border-slate-300 px-2 text-sm"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90" type="submit">
          Buscar
        </button>
      </form>
      <ProductsTable
        data={productsResult.items.map((item) => ({
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
      <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm">
        <p>
          Mostrando {(productsResult.page - 1) * productsResult.pageSize + (productsResult.total > 0 ? 1 : 0)}-
          {Math.min(productsResult.page * productsResult.pageSize, productsResult.total)} de {productsResult.total}
        </p>
        <div className="flex items-center gap-2">
          <a
            aria-disabled={productsResult.page <= 1}
            className={`rounded-md border px-3 py-1 ${productsResult.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-100"}`}
            href={makeHref(productsResult.page - 1)}
          >
            Anterior
          </a>
          <span>
            Pagina {productsResult.page} de {productsResult.totalPages}
          </span>
          <a
            aria-disabled={productsResult.page >= productsResult.totalPages}
            className={`rounded-md border px-3 py-1 ${productsResult.page >= productsResult.totalPages ? "pointer-events-none opacity-50" : "hover:bg-slate-100"}`}
            href={makeHref(productsResult.page + 1)}
          >
            Siguiente
          </a>
        </div>
      </div>
    </div>
  );
}
