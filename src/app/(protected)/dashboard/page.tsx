import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentMethodChart } from "@/modules/dashboard/components/payment-method-chart";
import { SalesBySupplierChart } from "@/modules/dashboard/components/sales-by-supplier-chart";
import { getDashboardMetrics } from "@/modules/dashboard/services/dashboard.service";
import { SalesTrendChart } from "@/modules/dashboard/components/sales-trend-chart";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const data = await getDashboardMetrics();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Ventas del dia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.salesToday)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.salesMonth)}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Productos con bajo stock</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.lowStock.length === 0 && <p className="text-sm text-slate-500">Sin alertas de stock.</p>}
            {data.lowStock.map((item) => (
              <Badge key={item.id} variant="destructive">
                {item.name} ({item.currentStock})
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia de ventas (7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesTrendChart data={data.trend} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventas por metodo de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentMethodChart data={data.byPaymentMethod} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas por proveedor</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesBySupplierChart data={data.bySupplier} />
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
