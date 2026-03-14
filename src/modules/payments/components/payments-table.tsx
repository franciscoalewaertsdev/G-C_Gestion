"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setMonthlyPaymentStatusAction } from "@/modules/payments/server-actions/payment.actions";

type PaymentRow = {
  key: string;
  supplierId: string;
  year: number;
  month: number;
  supplierName: string;
  monthLabel: string;
  albaranes: string[];
  payableAtCost: number;
  totalSales: number;
  isPaid: boolean;
};

export function PaymentsTable({ data }: { data: PaymentRow[] }) {
  const [paidRows, setPaidRows] = useState<Record<string, boolean>>(
    Object.fromEntries(data.map((row) => [row.key, row.isPaid]))
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const togglePayment = async (row: PaymentRow, checked: boolean) => {
    const previous = paidRows[row.key] ?? false;
    setPaidRows((prev) => ({ ...prev, [row.key]: checked }));
    setSavingKey(row.key);

    try {
      await setMonthlyPaymentStatusAction({
        supplierId: row.supplierId,
        year: row.year,
        month: row.month,
        isPaid: checked
      });
      setFeedback({
        type: "success",
        message: checked ? "Pago marcado como realizado." : "Pago marcado como pendiente."
      });
    } catch (error) {
      setPaidRows((prev) => ({ ...prev, [row.key]: previous }));
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo guardar el estado del pago."
      });
    } finally {
      setSavingKey(null);
    }
  };

  const totals = useMemo(() => {
    return data.reduce(
      (acc, row) => {
        acc.payable += row.payableAtCost;
        acc.sales += row.totalSales;
        return acc;
      },
      { payable: 0, sales: 0 }
    );
  }, [data]);

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Pago</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Mes</TableHead>
            <TableHead>Albaran</TableHead>
            <TableHead className="text-right">A pagar (costo)</TableHead>
            <TableHead className="text-right">Total ventas mes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const isPaid = paidRows[row.key] ?? false;
            return (
              <TableRow key={row.key} className={isPaid ? "bg-emerald-50/60" : undefined}>
                <TableCell>
                  <input
                    aria-label={`Marcar pago ${row.supplierName} ${row.monthLabel}`}
                    checked={isPaid}
                    className="h-4 w-4"
                    disabled={savingKey === row.key}
                    type="checkbox"
                    onChange={(event) => void togglePayment(row, event.target.checked)}
                  />
                </TableCell>
                <TableCell className="font-medium">{row.supplierName}</TableCell>
                <TableCell>{row.monthLabel}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    
                    <a
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      href={`/api/payments/${row.supplierId}/${row.year}/${row.month}/pdf`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Descargar
                    </a>
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(row.payableAtCost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.totalSales)}</TableCell>
              </TableRow>
            );
          })}
          {data.length === 0 && (
            <TableRow>
              <TableCell className="text-slate-500" colSpan={6}>
                No hay ventas registradas para mostrar pagos.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-1 rounded-lg border bg-slate-50 p-3 text-sm sm:items-end">
        <p>
          <span className="font-medium">Total a pagar (costo): </span>
          {formatCurrency(totals.payable)}
        </p>
        <p>
          <span className="font-medium">Total de ventas: </span>
          {formatCurrency(totals.sales)}
        </p>
      </div>
    </div>
  );
}
