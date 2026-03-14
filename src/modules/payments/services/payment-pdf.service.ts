import PDFDocument from "pdfkit";
import type { MonthlySupplierPaymentReport } from "@/modules/payments/services/payment.service";

export function buildPaymentPdfFileName(input: { supplierName: string; year: number; month: number }) {
  const cleanSupplier = input.supplierName.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_");
  const yyyymm = `${input.year}${String(input.month).padStart(2, "0")}`;
  return `Pago_${cleanSupplier}_${yyyymm}.pdf`;
}

export async function buildMonthlySupplierPaymentPdf(report: MonthlySupplierPaymentReport): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 36, size: "A4" });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const euro = (value: number) => `${value.toFixed(2)} EUR`;

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#0f172a").text(`RESUMEN MENSUAL GINGER & COCO`);
  doc.moveDown(0.5);

  doc.font("Helvetica-Bold").fontSize(11);
  doc.text(`Proveedor: ${report.supplierName}`);
  doc.moveDown(0.6);
  doc.text(`Mes: ${report.monthLabel}`);
  doc.moveDown(0.6);

  doc.font("Helvetica-Bold").fontSize(11);
  doc.text(`Total vendido del mes: ${euro(report.payableAtCost)}`);
  doc.moveDown(1);

  const tableTop = doc.y;
  const colQty = 36;
  const colProduct = 88;
  const colCode = 280;
  const colUnit = 388;
  const colTotal = 474;
  const rowHeight = 20;

  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("Cantidad", colQty, tableTop);
  doc.text("Producto", colProduct, tableTop);
  doc.text("Codigo", colCode, tableTop);
  doc.text("Precio unidad", colUnit, tableTop, { width: 80, align: "right" });
  doc.text("Precio total", colTotal, tableTop, { width: 80, align: "right" });
  doc.moveTo(36, tableTop + 14).lineTo(559, tableTop + 14).strokeColor("#cbd5e1").lineWidth(1).stroke();

  let y = tableTop + 20;
  doc.font("Helvetica").fontSize(10);

  for (const item of report.items) {
    if (y > 770) {
      doc.addPage();
      y = 40;
      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("Cantidad", colQty, y);
      doc.text("Producto", colProduct, y);
      doc.text("Codigo", colCode, y);
      doc.text("Precio unidad", colUnit, y, { width: 80, align: "right" });
      doc.text("Precio total", colTotal, y, { width: 80, align: "right" });
      doc.moveTo(36, y + 14).lineTo(559, y + 14).strokeColor("#cbd5e1").lineWidth(1).stroke();
      y += 20;
      doc.font("Helvetica").fontSize(10);
    }

    doc.text(String(item.quantity), colQty, y);
    doc.text(item.productName, colProduct, y, { width: colCode - colProduct - 10, ellipsis: true });
    doc.text(item.productCode ?? "-", colCode, y, { width: colUnit - colCode - 12, ellipsis: true });
    doc.text(euro(item.unitPrice), colUnit, y, { width: 80, align: "right" });
    doc.text(euro(item.totalPrice), colTotal, y, { width: 80, align: "right" });
    y += rowHeight;
  }

  if (report.items.length === 0) {
    doc.text("No hay productos vendidos para este proveedor en el mes indicado.", colQty, y);
  }

  let totalsY = y + 10;
  if (totalsY > 780) {
    doc.addPage();
    totalsY = 40;
  }

  doc.moveTo(colQty, totalsY).lineTo(559, totalsY).strokeColor("#cbd5e1").lineWidth(1).stroke();
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("Total a pagar", colUnit - 20, totalsY + 8, { width: 100, align: "right" });
  doc.text(euro(report.payableAtCost), colTotal, totalsY + 8, { width: 80, align: "right" });

  doc.end();
  await new Promise((resolve) => doc.on("end", resolve));

  return Buffer.concat(chunks);
}
