import PDFDocument from "pdfkit";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

type InvoicePdfInput = {
  invoiceNumber: string;
  issuedAt: Date;
  customerName: string;
  customerNif: string;
  customerAddress: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
};

function getInvoiceSequence(invoiceNumber: string) {
  const match = invoiceNumber.match(/(\d+)$/);
  const numericValue = match ? Number(match[1]) : 0;
  return String(Number.isNaN(numericValue) ? 0 : numericValue).padStart(5, "0");
}

export function buildInvoicePdfFileName(invoiceNumber: string) {
  return `Factura G&C N${getInvoiceSequence(invoiceNumber)}.pdf`;
}

export async function saveInvoicePdf(invoiceNumber: string, buffer: Buffer) {
  // Vercel serverless has a read-only filesystem; only /tmp is writable.
  const invoicesDir = process.env.VERCEL
    ? "/tmp"
    : path.join(process.cwd(), "invoices");
  await mkdir(invoicesDir, { recursive: true });

  const fileName = buildInvoicePdfFileName(invoiceNumber);
  const filePath = path.join(invoicesDir, fileName);
  await writeFile(filePath, buffer);

  return { fileName, filePath };
}

export async function buildInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 32 });
  const chunks: Buffer[] = [];
  const PAGE_WIDTH = 595.28;
  const CONTENT_LEFT = 38;
  const CONTENT_RIGHT = PAGE_WIDTH - 38;
  const BRAND_COLOR = "#a4683b";
  const ACCENT_COLOR = "#6f9965";
  const GRID_COLOR = "#ece7e5";

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatEuro = (value: number) => `${value.toFixed(2)} EUR`;

  // Header
  doc.fillColor(BRAND_COLOR).fontSize(28).font("Helvetica-Bold").text("FACTURA", CONTENT_LEFT, 36);

  const headerRightX = 350;
  doc.fontSize(12).font("Helvetica-Bold").fillColor(BRAND_COLOR).text("Nº FACTURA:", headerRightX, 46);
  doc.font("Helvetica").text(`A${String(Number(input.invoiceNumber)).padStart(4, "0")}`, headerRightX + 92, 46);
  doc.font("Helvetica-Bold").text("FECHA:", headerRightX, 66);
  doc.font("Helvetica").text(formatDate(input.issuedAt), headerRightX + 92, 66);
  doc.moveTo(headerRightX, 82).lineTo(CONTENT_RIGHT - 2, 82).lineWidth(1).strokeColor(BRAND_COLOR).stroke();

  
  // Client/Company columns
  const columnsTop = 130;
  const clientX = CONTENT_LEFT;
  const companyX = 360;

  doc.fillColor(BRAND_COLOR).fontSize(12).font("Helvetica-Bold").text("DATOS CLIENTE:", clientX, columnsTop);
  doc.moveTo(clientX, columnsTop + 18).lineTo(clientX + 160, columnsTop + 18).lineWidth(1).strokeColor(BRAND_COLOR).stroke();

  doc.fontSize(11).font("Helvetica").fillColor(BRAND_COLOR).text(`Nombre: ${input.customerName}`, clientX, columnsTop + 38);
  doc.text(`NIF/CIF: ${input.customerNif}`, clientX, columnsTop + 56);
  doc.text(`Direccion: ${input.customerAddress}`, clientX, columnsTop + 74, { width: 260 });

  doc.fontSize(12).font("Helvetica-Bold").text("DATOS EMPRESA:", companyX, columnsTop);
  doc.moveTo(companyX, columnsTop + 18).lineTo(companyX + 170, columnsTop + 18).lineWidth(1).strokeColor(BRAND_COLOR).stroke();

  doc.fontSize(11).font("Helvetica").text("Nombre: Ginger and Coco", companyX, columnsTop + 38);
  doc.text("NIF/CIF: 53849600E", companyX, columnsTop + 56);
  doc.text("Direccion: San Jaume 47, Sta Eularia", companyX, columnsTop + 74, { width: 200 });
  doc.text("Tel: 676780978", companyX, columnsTop + 92);
  doc.text("Mail: gingerandcocoibiza@gmail.com", companyX, columnsTop + 110, { width: 200 });

  // Table
  const tableTop = 292;
  const col1 = CONTENT_LEFT;
  const col2 = 118;
  const col3 = 356;
  const col4 = 438;
  const col5 = CONTENT_RIGHT;
  const rowHeight = 18;
  const visibleRows = Math.max(8, Math.min(12, input.items.length + 2));
  const tableBottom = tableTop + visibleRows * rowHeight;

  doc.fontSize(12).font("Helvetica-Bold").fillColor(BRAND_COLOR);
  doc.text("Cantidad", col1 + 10, tableTop - 20);
  doc.text("Descripcion", col2 + 8, tableTop - 20);
  doc.text("Precio/und", col3 + 6, tableTop - 20);
  doc.text("Total", col4 + 26, tableTop - 20);

  doc.moveTo(col1, tableTop - 4).lineTo(col5, tableTop - 4).lineWidth(1).strokeColor(BRAND_COLOR).stroke();

  doc.lineWidth(0.6).strokeColor(GRID_COLOR);
  for (let y = tableTop; y <= tableBottom + 0.1; y += rowHeight) {
    doc.moveTo(col1, y).lineTo(col5, y).stroke();
  }

  [col2, col3, col4, col5].forEach((x) => {
    doc.moveTo(x, tableTop - 4).lineTo(x, tableBottom).stroke();
  });

  // Item rows
  doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND_COLOR);
  input.items.slice(0, visibleRows).forEach((item, index) => {
    const y = tableTop + index * rowHeight + 5;
    doc.text(String(item.quantity), col1 + 35, y, { width: col2 - col1 - 10, align: "center" });
    doc.text(item.productName.toUpperCase(), col2 + 8, y, {
      width: col3 - col2 - 12,
      ellipsis: true
    });
    doc.text(formatEuro(item.unitPrice), col3 + 4, y, { width: col4 - col3 - 8, align: "right" });
    doc.text(formatEuro(item.subtotal), col4 + 4, y, { width: col5 - col4 - 8, align: "right" });
  });

  // Totals and payment
  const totalsY = tableBottom + 22;
  const totalsRowGap = 26;
  doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND_COLOR);
  doc.text("SUBTOTAL", col3 + 6, totalsY);
  doc.text(formatEuro(input.subtotal), col4 + 4, totalsY, { width: col5 - col4 - 8, align: "right" });

  let totalRowY = totalsY + totalsRowGap;
  if (input.discount > 0) {
    doc.font("Helvetica-Bold").fontSize(12).text("DESCUENTO", col3 + 6, totalRowY);
    doc.text(formatEuro(input.discount), col4 + 4, totalRowY, { width: col5 - col4 - 8, align: "right" });
    totalRowY += totalsRowGap;
  }

  doc.fontSize(14).text("TOTAL:", col3 + 6, totalRowY);
  doc.text(formatEuro(input.total), col4 + 4, totalRowY, { width: col5 - col4 - 8, align: "right" });

  const paymentY = totalRowY + 50;
  doc.font("Helvetica-Bold").fontSize(12).text("Metodo de pago", col1, paymentY);
  doc.moveTo(col1, paymentY + 16).lineTo(col1 + 160, paymentY + 16).lineWidth(1).strokeColor(BRAND_COLOR).stroke();
  doc.font("Helvetica").fontSize(11).text(input.paymentMethod, col1, paymentY + 22);

  doc.end();
  await new Promise((resolve) => doc.on("end", resolve));

  return Buffer.concat(chunks);
}
