"use server";

import { format } from "date-fns";
import { exportRowsToExcel } from "@/lib/reports/excel-export";
import {
  exportCurrentStockBySupplierPdf,
  exportMonthlySalesBySupplierPdf,
  exportRowsToPdf
} from "@/lib/reports/pdf-export";
import {
  getBillingByCustomer,
  getCurrentStockBySupplierReport,
  getMonthlySalesBySupplierReport,
  getSalesBySupplier,
  getSalesReport,
  getStockReport
} from "@/modules/reports/services/report.service";
import { ExportResult, ReportType } from "@/modules/reports/types/report.types";

function toBase64Export(fileName: string, contentType: string, buffer: Buffer): ExportResult {
  return {
    fileName,
    contentType,
    base64: buffer.toString("base64")
  };
}

export async function exportReportPdfAction(reportType: ReportType): Promise<ExportResult> {
  const dateTag = format(new Date(), "yyyyMMdd-HHmm");

  if (reportType === "stock") {
    const stock = await getCurrentStockBySupplierReport();
    const buffer = await exportCurrentStockBySupplierPdf(stock);
    return toBase64Export(`stock-${dateTag}.pdf`, "application/pdf", buffer);
  }

  if (reportType === "invoices") {
    const billing = await getBillingByCustomer();
    const rows = billing.map((item) => [item.customer, String(item.invoices), item.total.toFixed(2)]);
    const buffer = await exportRowsToPdf("Facturacion por Cliente", ["Cliente", "Facturas", "Total"], rows);
    return toBase64Export(`facturacion-${dateTag}.pdf`, "application/pdf", buffer);
  }

  if (reportType === "suppliers") {
    const bySupplier = await getSalesBySupplier();
    const rows = bySupplier.map((item) => [item.supplier, item.total.toFixed(2)]);
    const buffer = await exportRowsToPdf("Ventas por Proveedor", ["Proveedor", "Total"], rows);
    return toBase64Export(`proveedores-${dateTag}.pdf`, "application/pdf", buffer);
  }

  const salesBySupplier = await getMonthlySalesBySupplierReport();
  const buffer = await exportMonthlySalesBySupplierPdf(salesBySupplier);
  return toBase64Export(`ventas-${dateTag}.pdf`, "application/pdf", buffer);
}

export async function exportReportExcelAction(reportType: ReportType): Promise<ExportResult> {
  const dateTag = format(new Date(), "yyyyMMdd-HHmm");

  if (reportType === "stock") {
    const stock = await getStockReport();
    const rows = stock.products.map((item) => ({
      producto: item.name,
      proveedor: item.supplier.name,
      stock: item.currentStock,
      precio: Number(item.price)
    }));
    const buffer = exportRowsToExcel("Stock", rows);
    return toBase64Export(`stock-${dateTag}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer);
  }

  if (reportType === "suppliers") {
    const bySupplier = await getSalesBySupplier();
    const rows = bySupplier.map((item) => ({
      proveedor: item.supplier,
      total: item.total
    }));
    const buffer = exportRowsToExcel("Proveedores", rows);
    return toBase64Export(`proveedores-${dateTag}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer);
  }

  const sales = await getSalesReport("month");
  const rows = sales.sales.map((sale) => ({
    venta: sale.id,
    fecha: new Date(sale.saleDate).toISOString(),
    subtotal: Number(sale.subtotal),
    descuento: Number(sale.discountAmount),
    total: Number(sale.totalFinal)
  }));
  const buffer = exportRowsToExcel("Ventas", rows);
  return toBase64Export(`ventas-${dateTag}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer);
}
