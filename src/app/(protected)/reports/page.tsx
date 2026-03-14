import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ReportExportPanel } from "@/modules/reports/components/report-export-panel";
import {
  getBillingByCustomer,
  getSalesBySupplier,
  getSalesReport,
  getStockReport,
  getTopProducts
} from "@/modules/reports/services/report.service";

export default async function ReportsPage() {
  const [salesMonth, stock, topProducts, salesBySupplier, billingByCustomer] = await Promise.all([
    getSalesReport("month"),
    getStockReport(),
    getTopProducts(),
    getSalesBySupplier(),
    getBillingByCustomer()
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reportes y balances</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventas del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(salesMonth.total)}</p>
            <ReportExportPanel reportType="sales" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>STOCK TOTAL</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stock.inventoryValue)}</p>
            <ReportExportPanel reportType="stock" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos mas vendidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {topProducts.map((item) => (
            <p key={item.product?.id}>{item.product?.name} - {item.quantity} uds.</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ventas por proveedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {salesBySupplier.map((item) => (
            <p key={item.supplier}>{item.supplier} - {formatCurrency(item.total)}</p>
          ))}
          <div className="pt-3">
            <ReportExportPanel reportType="suppliers" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturacion por cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {billingByCustomer.map((item) => (
            <p key={item.customer}>{item.customer} - {item.invoices} facturas - {formatCurrency(item.total)}</p>
          ))}
          <div className="pt-3">
            <ReportExportPanel reportType="invoices" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
