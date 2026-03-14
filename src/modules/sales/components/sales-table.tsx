"use client";

import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { DataTable } from "@/lib/table/data-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteSaleAction, updateSaleDiscountAction } from "@/modules/sales/server-actions/sale.actions";

type SaleRow = {
  id: string;
  invoiceId?: string;
  saleDate: string;
  customer: string;
  customerDocument?: string | null;
  customerEmail?: string | null;
  subtotal: number;
  discountType: "NONE" | "PERCENTAGE" | "FIXED";
  paymentMethod: "EFECTIVO" | "TARJETA";
  discountValue: number;
  discountAmount: number;
  totalFinal: number;
  items: Array<{
    productName: string;
    variantLabel?: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
};

export function SalesTable({ data }: { data: SaleRow[] }) {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editDiscountType, setEditDiscountType] = useState<"NONE" | "PERCENTAGE" | "FIXED">("NONE");
  const [editDiscountValue, setEditDiscountValue] = useState("");

  useEffect(() => {
    if (feedback?.type !== "success" || feedback.message !== "Venta eliminada correctamente.") {
      return;
    }

    const timeout = setTimeout(() => {
      setFeedback(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [feedback]);

  const startEdit = (row: SaleRow) => {
    setEditingId(row.id);
    setPendingDeleteId(null);
    setEditDiscountType(row.discountType);
    setEditDiscountValue(String(row.discountValue));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDiscountType("NONE");
    setEditDiscountValue("");
  };

  const saveEdit = async (id: string) => {
    const value = Number(editDiscountValue);
    if (Number.isNaN(value)) {
      setFeedback({ type: "error", message: "El valor del descuento no es valido." });
      return;
    }

    try {
      await updateSaleDiscountAction({
        id,
        discountType: editDiscountType,
        discountValue: value
      });
      cancelEdit();
      setFeedback({ type: "success", message: "Venta actualizada correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo editar la venta."
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSaleAction(id);
      setPendingDeleteId(null);
      setFeedback({ type: "success", message: "Venta eliminada correctamente." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo eliminar la venta."
      });
    }
  };

  const columns = useMemo<ColumnDef<SaleRow>[]>(
    () => [
      { accessorKey: "id", header: "Venta" },
      {
        accessorKey: "saleDate",
        header: "Fecha",
        cell: ({ row }) => formatDate(row.original.saleDate)
      },
      { accessorKey: "customer", header: "Cliente" },
      {
        accessorKey: "paymentMethod",
        header: "Pago",
        cell: ({ row }) => (row.original.paymentMethod === "EFECTIVO" ? "Efectivo" : "Tarjeta")
      },
      {
        accessorKey: "subtotal",
        header: "Subtotal",
        cell: ({ row }) => formatCurrency(row.original.subtotal)
      },
      {
        accessorKey: "discountAmount",
        header: "Descuento",
        cell: ({ row }) => formatCurrency(row.original.discountAmount)
      },
      {
        accessorKey: "totalFinal",
        header: "Total",
        cell: ({ row }) => formatCurrency(row.original.totalFinal)
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            {editingId === row.original.id ? (
              <>
                <select
                  className="rounded-md border bg-white px-2 py-1 text-xs"
                  value={editDiscountType}
                  onChange={(event) =>
                    setEditDiscountType(event.target.value as "NONE" | "PERCENTAGE" | "FIXED")
                  }
                >
                  <option value="NONE">Sin descuento</option>
                  <option value="PERCENTAGE">Porcentaje</option>
                  <option value="FIXED">Fijo</option>
                </select>
                <input
                  className="w-20 rounded-md border px-2 py-1 text-xs"
                  type="number"
                  step="0.01"
                  value={editDiscountValue}
                  onChange={(event) => setEditDiscountValue(event.target.value)}
                />
                <button
                  type="button"
                  className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700"
                  onClick={() => void saveEdit(row.original.id)}
                >
                  Guardar
                </button>
                <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={cancelEdit}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                {row.original.invoiceId && (
                  <a
                    href={`/api/invoices/${row.original.invoiceId}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border"
                    title="Descargar factura"
                    aria-label="Descargar factura"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs"
                  onClick={() => startEdit(row.original)}
                >
                  Editar
                </button>
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
                  <button
                    type="button"
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600"
                    onClick={() => {
                      cancelEdit();
                      setPendingDeleteId(row.original.id);
                    }}
                  >
                    Eliminar
                  </button>
                )}

                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-md border px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">
                    Vista previa
                  </summary>
                  <div className="absolute right-0 z-20 mt-1 w-80 rounded-md border bg-white p-3 shadow-lg">
                    <p className="text-xs font-semibold text-slate-700">Detalle de la orden</p>
                    <div className="mt-2 max-h-48 space-y-1 overflow-auto pr-1 text-xs text-slate-700">
                      {row.original.items.length === 0 && <p>No hay items en la venta.</p>}
                      {row.original.items.map((item, itemIndex) => (
                        <div key={`${row.original.id}-item-${itemIndex}`} className="rounded border px-2 py-1">
                          <p className="font-medium">{item.productName}</p>
                          {item.variantLabel && <p className="text-slate-600">{item.variantLabel}</p>}
                          <p>
                            {item.quantity} x {formatCurrency(item.unitPrice)} = {formatCurrency(item.subtotal)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 space-y-1 border-t pt-2 text-xs text-slate-700">
                      <p>
                        <span className="font-medium">Total:</span> {formatCurrency(row.original.totalFinal)}
                      </p>
                      <p>
                        <span className="font-medium">Pago:</span>{" "}
                        {row.original.paymentMethod === "EFECTIVO" ? "Efectivo" : "Tarjeta"}
                      </p>
                      <p>
                        <span className="font-medium">Facturo:</span> {row.original.invoiceId ? "Si" : "No"}
                      </p>
                      {row.original.invoiceId && (
                        <>
                          <p>
                            <span className="font-medium">Cliente:</span> {row.original.customer}
                          </p>
                          <p>
                            <span className="font-medium">Documento:</span>{" "}
                            {row.original.customerDocument ?? "No informado"}
                          </p>
                          {row.original.customerEmail && (
                            <p>
                              <span className="font-medium">Email:</span> {row.original.customerEmail}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </details>
              </>
            )}
          </div>
        )
      }
    ],
    [editDiscountType, editDiscountValue, editingId, pendingDeleteId]
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
      <DataTable columns={columns} data={data} searchColumn="id" searchPlaceholder="Buscar venta..." />
    </div>
  );
}
