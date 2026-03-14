import PDFDocument from "pdfkit";
import type {
  CurrentStockBySupplierReport,
  MonthlySalesBySupplierReport
} from "@/modules/reports/services/report.service";

export async function exportRowsToPdf(title: string, headers: string[], rows: Array<string[]>) {
  const doc = new PDFDocument({ margin: 32, size: "A4" });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  doc.fontSize(16).text(title, { underline: true });
  doc.moveDown(1);
  doc.fontSize(10).text(headers.join(" | "));
  doc.moveDown(0.5);

  for (const row of rows) {
    doc.text(row.join(" | "));
  }

  doc.end();

  await new Promise((resolve) => doc.on("end", resolve));
  return Buffer.concat(chunks);
}

export async function exportMonthlySalesBySupplierPdf(report: MonthlySalesBySupplierReport): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 32, size: "A4" });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const money = (value: number) => `${value.toFixed(2)} EUR`;

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text("REPORTE DE VENTAS DEL MES");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10).fillColor("#334155").text(`Mes: ${report.monthLabel}`);
  doc.moveDown(0.8);

  const colProduct = 36;
  const colQty = 360;
  const colTotal = 450;
  const rowHeight = 18;

  const ensureSpace = (required = 40) => {
    if (doc.y + required > 780) {
      doc.addPage();
    }
  };

  if (report.suppliers.length === 0) {
    doc.font("Helvetica").fontSize(11).text("No hay ventas registradas para este mes.");
  }

  for (const supplier of report.suppliers) {
    ensureSpace(80);

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text(`Proveedor: ${supplier.supplier}`, 36, doc.y);
    doc.moveDown(0.2);

    const headerY = doc.y;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#1e293b");
    doc.text("Producto", colProduct, headerY);
    doc.text("Cantidad", colQty, headerY, { width: 70, align: "right" });
    doc.text("Total", colTotal, headerY, { width: 90, align: "right" });
    doc.moveTo(36, headerY + 14).lineTo(559, headerY + 14).strokeColor("#cbd5e1").lineWidth(1).stroke();

    let y = headerY + 20;
    doc.font("Helvetica").fontSize(10).fillColor("#111827");

    for (const item of supplier.items) {
      if (y > 770) {
        doc.addPage();
        y = 40;
      }

      doc.text(item.productName, colProduct, y, { width: colQty - colProduct - 10, ellipsis: true });
      doc.text(String(item.quantity), colQty, y, { width: 70, align: "right" });
      doc.text(money(item.total), colTotal, y, { width: 90, align: "right" });
      y += rowHeight;
    }

    if (y > 770) {
      doc.addPage();
      y = 40;
    }

    doc.moveTo(36, y + 2).lineTo(559, y + 2).strokeColor("#e2e8f0").lineWidth(1).stroke();
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a");
    doc.text("Subtotal proveedor", colQty - 40, y + 8, { width: 110, align: "right" });
    doc.text(money(supplier.subtotal), colTotal, y + 8, { width: 90, align: "right" });

    doc.y = y + 28;
    doc.moveDown(0.8);
  }

  ensureSpace(50);
  const totalY = doc.y;
  doc.moveTo(36, totalY).lineTo(559, totalY).strokeColor("#94a3b8").lineWidth(1).stroke();
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a");
  doc.text("TOTAL VENTAS DEL MES", 350, totalY + 10, { width: 120, align: "right" });
  doc.text(money(report.totalMonth), colTotal, totalY + 10, { width: 90, align: "right" });

  doc.end();
  await new Promise((resolve) => doc.on("end", resolve));

  return Buffer.concat(chunks);
}

export async function exportCurrentStockBySupplierPdf(report: CurrentStockBySupplierReport): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 32, size: "A4" });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const money = (value: number) => `${value.toFixed(2)} EUR`;

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text("REPORTE STOCK TOTAL");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10).fillColor("#334155").text(`Fecha: ${report.generatedAtLabel}`);
  doc.moveDown(0.8);

  const colProduct = 36;
  const colStock = 320;
  const colUnitCost = 400;
  const colTotal = 485;
  const rowHeight = 18;

  const ensureSpace = (required = 40) => {
    if (doc.y + required > 780) {
      doc.addPage();
    }
  };

  if (report.suppliers.length === 0) {
    doc.font("Helvetica").fontSize(11).text("No hay productos cargados.");
  }

  for (const supplier of report.suppliers) {
    ensureSpace(80);

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a").text(`Proveedor: ${supplier.supplier}`, 36, doc.y);
    doc.moveDown(0.2);

    const headerY = doc.y;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#1e293b");
    doc.text("Producto", colProduct, headerY);
    doc.text("Stock", colStock, headerY, { width: 60, align: "right" });
    doc.text("Costo", colUnitCost, headerY, { width: 75, align: "right" });
    doc.text("Total", colTotal, headerY, { width: 75, align: "right" });
    doc.moveTo(36, headerY + 14).lineTo(559, headerY + 14).strokeColor("#cbd5e1").lineWidth(1).stroke();

    let y = headerY + 20;
    doc.font("Helvetica").fontSize(10).fillColor("#111827");

    for (const item of supplier.items) {
      if (y > 770) {
        doc.addPage();
        y = 40;
      }

      doc.text(item.productName, colProduct, y, { width: colStock - colProduct - 10, ellipsis: true });
      doc.text(String(item.stock), colStock, y, { width: 60, align: "right" });
      doc.text(money(item.unitCost), colUnitCost, y, { width: 75, align: "right" });
      doc.text(money(item.totalCost), colTotal, y, { width: 75, align: "right" });
      y += rowHeight;
    }

    if (y > 770) {
      doc.addPage();
      y = 40;
    }

    doc.moveTo(36, y + 2).lineTo(559, y + 2).strokeColor("#e2e8f0").lineWidth(1).stroke();
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a");
    doc.text("Subtotal proveedor", colUnitCost - 20, y + 8, { width: 95, align: "right" });
    doc.text(money(supplier.subtotal), colTotal, y + 8, { width: 75, align: "right" });

    doc.y = y + 28;
    doc.moveDown(0.8);
  }

  ensureSpace(50);
  const totalY = doc.y;
  doc.moveTo(36, totalY).lineTo(559, totalY).strokeColor("#94a3b8").lineWidth(1).stroke();
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a");
  doc.text("TOTAL STOCK", 365, totalY + 10, { width: 110, align: "right" });
  doc.text(money(report.totalInventoryCost), colTotal, totalY + 10, { width: 75, align: "right" });

  doc.end();
  await new Promise((resolve) => doc.on("end", resolve));

  return Buffer.concat(chunks);
}
