import { PaymentsTable } from "@/modules/payments/components/payments-table";
import { getMonthlySupplierPayments } from "@/modules/payments/services/payment.service";

export default async function PaymentsPage() {
  const rows = await getMonthlySupplierPayments();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pagos</h2>
        <p className="text-sm text-slate-600">Resumen mensual por proveedor con total a pagar al costo y ventas del mes.</p>
      </div>

      <PaymentsTable
        data={rows.map((row) => ({
          key: row.key,
          supplierId: row.supplierId,
          year: row.year,
          month: row.month,
          supplierName: row.supplierName,
          monthLabel: row.monthLabel,
          albaranes: row.albaranes,
          payableAtCost: row.payableAtCost,
          totalSales: row.totalSales,
          isPaid: row.isPaid
        }))}
      />
    </div>
  );
}
