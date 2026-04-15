import { prisma } from "@/db/prisma";
import { listProductsForSaleForm } from "@/modules/products/services/product.service";
import { SaleForm } from "@/modules/sales/components/sale-form";
import { SalesTable } from "@/modules/sales/components/sales-table";
import { listSalesPaginated } from "@/modules/sales/services/sale.service";

type SalesPageProps = {
  searchParams?: {
    page?: string;
    pageSize?: string;
    saleDate?: string;
    customer?: string;
    paymentMethod?: string;
  };
};

function getPositiveInt(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const page = getPositiveInt(searchParams?.page, 1, 100000);
  const pageSize = getPositiveInt(searchParams?.pageSize, 25, 100);
  const saleDate = searchParams?.saleDate?.trim() || "";
  const customer = searchParams?.customer?.trim() || "";
  const paymentMethod =
    searchParams?.paymentMethod === "EFECTIVO" || searchParams?.paymentMethod === "TARJETA"
      ? searchParams.paymentMethod
      : "ALL";

  const [salesResult, products, suppliers] = await Promise.all([
    listSalesPaginated({
      page,
      pageSize,
      saleDate: saleDate || undefined,
      customer: customer || undefined,
      paymentMethod: paymentMethod !== "ALL" ? paymentMethod : undefined
    }),
    listProductsForSaleForm(),
    prisma.supplier.findMany({
      where: {
        OR: [{ email: null }, { email: { not: "deleted-supplier@system.local" } }]
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  const makeHref = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("pageSize", String(salesResult.pageSize));
    if (saleDate) {
      params.set("saleDate", saleDate);
    }
    if (customer) {
      params.set("customer", customer);
    }
    if (paymentMethod !== "ALL") {
      params.set("paymentMethod", paymentMethod);
    }
    return `/sales?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Ventas</h2>
      <SaleForm
        suppliers={suppliers}
        products={products.map((item) => ({
          id: item.id,
          name: item.name,
          barcode: item.barcode,
          price: Number(item.price),
          stock: item.currentStock,
          supplierId: item.supplier.id,
          supplierName: item.supplier.name,
          variants: item.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            value: variant.value,
            stock: variant.stock
          }))
        }))}
      />
      <form className="flex items-center justify-start gap-2 overflow-x-auto rounded-lg border bg-white p-2" method="get">
        <input type="hidden" name="page" value="1" />
        <select
          name="pageSize"
          defaultValue={String(salesResult.pageSize)}
          className="h-8 rounded-md border border-slate-300 px-2 text-xs"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <input
          name="saleDate"
          type="date"
          defaultValue={saleDate}
          className="h-8 rounded-md border border-slate-300 px-2 text-xs"
        />
        <input
          name="customer"
          defaultValue={customer}
          placeholder="Cliente"
          className="h-8 min-w-40 rounded-md border border-slate-300 px-2 text-xs"
        />
        <select
          name="paymentMethod"
          defaultValue={paymentMethod}
          className="h-8 rounded-md border border-slate-300 px-2 text-xs"
        >
          <option value="ALL">Todos los pagos</option>
          <option value="EFECTIVO">Efectivo</option>
          <option value="TARJETA">Tarjeta</option>
        </select>
        <button className="h-8 whitespace-nowrap rounded-md bg-primary px-3 text-xs font-medium text-white hover:bg-primary/90" type="submit">
          Aplicar
        </button>
        <a
          href="/sales"
          className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 px-3 text-xs font-medium"
        >
          Limpiar
        </a>
      </form>
      <SalesTable
        data={salesResult.items.map((sale) => ({
          id: sale.id,
          invoiceId: sale.invoice?.id,
          saleDate: new Date(sale.saleDate).toISOString(),
          customer: sale.customer?.name ?? "Cliente general",
          customerDocument: sale.customer?.documentId ?? null,
          customerEmail: sale.customer?.email ?? null,
          subtotal: Number(sale.subtotal),
          discountType: sale.discountType,
          paymentMethod: sale.paymentMethod,
          discountValue: Number(sale.discountValue),
          discountAmount: Number(sale.discountAmount),
          totalFinal: Number(sale.totalFinal),
          items: sale.items.map((item) => ({
            productName: item.product?.name ?? item.manualProductName ?? "Producto manual",
            variantLabel: item.variant ? `${item.variant.name}: ${item.variant.value}` : null,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            subtotal: Number(item.subtotal)
          }))
        }))}
      />
      <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm">
        <p>
          Mostrando {(salesResult.page - 1) * salesResult.pageSize + (salesResult.total > 0 ? 1 : 0)}-
          {Math.min(salesResult.page * salesResult.pageSize, salesResult.total)} de {salesResult.total}
        </p>
        <div className="flex items-center gap-2">
          <a
            aria-disabled={salesResult.page <= 1}
            className={`rounded-md border px-3 py-1 ${salesResult.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-100"}`}
            href={makeHref(salesResult.page - 1)}
          >
            Anterior
          </a>
          <span>
            Pagina {salesResult.page} de {salesResult.totalPages}
          </span>
          <a
            aria-disabled={salesResult.page >= salesResult.totalPages}
            className={`rounded-md border px-3 py-1 ${salesResult.page >= salesResult.totalPages ? "pointer-events-none opacity-50" : "hover:bg-slate-100"}`}
            href={makeHref(salesResult.page + 1)}
          >
            Siguiente
          </a>
        </div>
      </div>
    </div>
  );
}
