"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { DataTable } from "@/lib/table/data-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteInvoiceAction } from "@/modules/invoices/server-actions/invoice.actions";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  issuedAt: string;
  customer: string;
  total: number;
};

export function InvoicesTable({ data }: { data: InvoiceRow[] }) {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteInvoiceAction(id);
      setPendingDeleteId(null);
      setFeedback({ type: "success", message: "Factura eliminada correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo eliminar la factura."
      });
    }
  };

  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "Factura",
        cell: ({ row }) => (
          <Link className="text-blue-600 underline" href={`/invoices/${row.original.id}`}>
            {row.original.invoiceNumber}
          </Link>
        )
      },
      {
        accessorKey: "issuedAt",
        header: "Fecha",
        cell: ({ row }) => formatDate(row.original.issuedAt)
      },
      { accessorKey: "customer", header: "Cliente" },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => formatCurrency(row.original.total)
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex min-w-[220px] flex-nowrap items-center gap-1">
            {pendingDeleteId === row.original.id ? (
              <>
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600"
                  onClick={() => void handleDelete(row.original.id)}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs"
                  onClick={() => setPendingDeleteId(null)}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <Link href={`/invoices/${row.original.id}`} className="rounded-md border px-2 py-1 text-xs">
                  Editar
                </Link>
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600"
                  onClick={() => setPendingDeleteId(row.original.id)}
                >
                  Eliminar
                </button>
                <a
                  href={`/api/invoices/${row.original.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-700"
                  title="Descargar factura"
                  aria-label="Descargar factura"
                >
                  <Download className="h-4 w-4" strokeWidth={2.2} />
                </a>
              </>
            )}
          </div>
        )
      }
    ],
    [pendingDeleteId]
  );

  return (
    <div className="space-y-3">
      {feedback && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}
      <DataTable columns={columns} data={data} searchColumn="invoiceNumber" searchPlaceholder="Buscar factura..." />
    </div>
  );
}
