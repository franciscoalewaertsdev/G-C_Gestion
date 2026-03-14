import { InvoicesTable } from "@/modules/invoices/components/invoices-table";
import { listInvoicesPaginated } from "@/modules/invoices/services/invoice.service";

type InvoicesPageProps = {
  searchParams?: {
    page?: string;
    pageSize?: string;
  };
};

function getPositiveInt(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const page = getPositiveInt(searchParams?.page, 1, 100000);
  const pageSize = getPositiveInt(searchParams?.pageSize, 25, 100);

  const invoicesResult = await listInvoicesPaginated({ page, pageSize });

  const makeHref = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("pageSize", String(invoicesResult.pageSize));
    return `/invoices?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Facturas</h2>
      <form className="flex items-center gap-2" method="get">
        <select
          name="pageSize"
          defaultValue={String(invoicesResult.pageSize)}
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
      <InvoicesTable
        data={invoicesResult.items.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          issuedAt: new Date(invoice.issuedAt).toISOString(),
          customer: invoice.customer?.name ?? "Cliente general",
          total: Number(invoice.sale.totalFinal)
        }))}
      />
      <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm">
        <p>
          Mostrando {(invoicesResult.page - 1) * invoicesResult.pageSize + (invoicesResult.total > 0 ? 1 : 0)}-
          {Math.min(invoicesResult.page * invoicesResult.pageSize, invoicesResult.total)} de {invoicesResult.total}
        </p>
        <div className="flex items-center gap-2">
          <a
            aria-disabled={invoicesResult.page <= 1}
            className={`rounded-md border px-3 py-1 ${invoicesResult.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-100"}`}
            href={makeHref(invoicesResult.page - 1)}
          >
            Anterior
          </a>
          <span>
            Pagina {invoicesResult.page} de {invoicesResult.totalPages}
          </span>
          <a
            aria-disabled={invoicesResult.page >= invoicesResult.totalPages}
            className={`rounded-md border px-3 py-1 ${invoicesResult.page >= invoicesResult.totalPages ? "pointer-events-none opacity-50" : "hover:bg-slate-100"}`}
            href={makeHref(invoicesResult.page + 1)}
          >
            Siguiente
          </a>
        </div>
      </div>
    </div>
  );
}
