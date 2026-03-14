import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { getStockEntryById } from "@/modules/inventory/services/stock-entry.service";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const stockEntry = await getStockEntryById(params.id);

  if (!stockEntry) {
    return NextResponse.json({ error: "Albaran no encontrado" }, { status: 404 });
  }

  const doc = new PDFDocument({ margin: 36, size: "A4" });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const entryDate = new Date(stockEntry.entryDate);
  const dateLabel = entryDate.toISOString().slice(0, 10);
  const fileName = `albaran-${dateLabel}-${stockEntry.id.slice(-6)}.pdf`;

  const money = (value: number) => `${value.toFixed(2)} EUR`;

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#0f172a").text("ALBARAN DE INGRESO");
  doc.moveDown(0.4);

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827");
  doc.text(`Proveedor: ${stockEntry.supplier.name}`);
  doc.moveDown(0.4);
  doc.text(`Fecha: ${dateLabel}`);
  doc.moveDown(0.8);

  const colProduct = 36;
  const colCode = 276;
  const colQty = 360;
  const colUnitCost = 450;
  const rowHeight = 20;

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#1e293b");
  const tableTop = doc.y;
  doc.text("Producto", colProduct, tableTop);
  doc.text("Codigo / SKU", colCode, tableTop);
  doc.text("Cantidad", colQty, tableTop, { width: 70, align: "right" });
  doc.text("Costo", colUnitCost, tableTop, { width: 90, align: "right" });
  doc.moveTo(36, tableTop + 14).lineTo(559, tableTop + 14).strokeColor("#cbd5e1").lineWidth(1).stroke();

  let y = tableTop + 20;
  let totalCost = 0;

  doc.font("Helvetica").fontSize(10).fillColor("#111827");

  for (const item of stockEntry.items) {
    if (y > 770) {
      doc.addPage();
      y = 40;
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#1e293b");
      doc.text("Producto", colProduct, y);
      doc.text("Codigo / SKU", colCode, y);
      doc.text("Cantidad", colQty, y, { width: 70, align: "right" });
      doc.text("Costo", colUnitCost, y, { width: 90, align: "right" });
      doc.moveTo(36, y + 14).lineTo(559, y + 14).strokeColor("#cbd5e1").lineWidth(1).stroke();
      y += 20;
      doc.font("Helvetica").fontSize(10).fillColor("#111827");
    }

    const unitCost = item.unitCost !== null ? Number(item.unitCost) : Number(item.product.costPrice);
    const lineCost = unitCost * item.quantity;
    totalCost += lineCost;

    doc.text(item.product.name, colProduct, y, { width: colCode - colProduct - 10, ellipsis: true });
    doc.text(item.product.barcode?.trim() || "-", colCode, y, { width: colQty - colCode - 10, ellipsis: true });
    doc.text(String(item.quantity), colQty, y, { width: 70, align: "right" });
    doc.text(money(unitCost), colUnitCost, y, { width: 90, align: "right" });

    y += rowHeight;
  }

  if (stockEntry.items.length === 0) {
    doc.text("No hay items en este ingreso.", colProduct, y);
    y += rowHeight;
  }

  doc.end();
  await new Promise((resolve) => doc.on("end", resolve));

  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
