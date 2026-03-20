import { prisma } from "@/db/prisma";
import { StockEntryForm } from "@/modules/inventory/components/stock-entry-form";
import { InventoryEntryActions } from "@/modules/inventory/components/inventory-entry-actions";
import { listStockEntriesPaginated } from "@/modules/inventory/services/stock-entry.service";
import { formatDate } from "@/lib/utils";

type InventoryPageProps = {
  searchParams?: {
    page?: string;
    pageSize?: string;
    supplierId?: string;
  };
};

function getPositiveInt(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const page = getPositiveInt(searchParams?.page, 1, 100000);
  const pageSize = getPositiveInt(searchParams?.pageSize, 25, 100);
  const selectedSupplierId = searchParams?.supplierId?.trim() || "ALL";

  const [entriesResult, suppliers, products] = await Promise.all([
    listStockEntriesPaginated({
      page,
      pageSize,
      supplierId: selectedSupplierId !== "ALL" ? selectedSupplierId : undefined
    }),
    prisma.supplier.findMany({
      where: {
        OR: [{ email: null }, { email: { not: "deleted-supplier@system.local" } }]
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        costPrice: true,
        supplierId: true,
        variants: {
          select: {
            id: true,
            name: true,
            value: true
          }
        }
      },
      orderBy: { name: "asc" }
    })
  ]);

  const productsForForm = products.map((product) => ({
    ...product,
    costPrice: Number(product.costPrice)
  }));

  const makeHref = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("pageSize", String(entriesResult.pageSize));
    if (selectedSupplierId !== "ALL") {
      params.set("supplierId", selectedSupplierId);
    }
    return `/inventory?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Ingresos de mercaderia (Albaranes)</h2>
      <StockEntryForm suppliers={suppliers} products={productsForForm} />

      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-3 font-semibold">Historial de ingresos</h3>
        <form className="mb-3 flex items-center gap-2" method="get">
          <select
            name="supplierId"
            defaultValue={selectedSupplierId}
            className="h-10 rounded-md border border-slate-300 px-2 text-sm"
          >
            <option value="ALL">Todos los proveedores</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
          <select
            name="pageSize"
            defaultValue={String(entriesResult.pageSize)}
            className="h-10 rounded-md border border-slate-300 px-2 text-sm"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90" type="submit">
            Aplicar
          </button>
        </form>
        <div className="space-y-2 text-sm">
          {entriesResult.items.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <p>
                {formatDate(entry.entryDate)} - {entry.supplier.name} - {entry._count.items} items
              </p>
              <div className="flex gap-1">
                <a
                  className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-100"
                  href={`/api/inventory/${entry.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Descargar PDF
                </a>
                <InventoryEntryActions id={entry.id} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm">
          <p>
            Mostrando {(entriesResult.page - 1) * entriesResult.pageSize + (entriesResult.total > 0 ? 1 : 0)}-
            {Math.min(entriesResult.page * entriesResult.pageSize, entriesResult.total)} de {entriesResult.total}
          </p>
          <div className="flex items-center gap-2">
            <a
              aria-disabled={entriesResult.page <= 1}
              className={`rounded-md border px-3 py-1 ${entriesResult.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-100"}`}
              href={makeHref(entriesResult.page - 1)}
            >
              Anterior
            </a>
            <span>
              Pagina {entriesResult.page} de {entriesResult.totalPages}
            </span>
            <a
              aria-disabled={entriesResult.page >= entriesResult.totalPages}
              className={`rounded-md border px-3 py-1 ${entriesResult.page >= entriesResult.totalPages ? "pointer-events-none opacity-50" : "hover:bg-slate-100"}`}
              href={makeHref(entriesResult.page + 1)}
            >
              Siguiente
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
