import { NextResponse } from "next/server";
import {
  buildInvoicePdf,
  buildInvoicePdfFileName,
  saveInvoicePdf
} from "@/modules/invoices/services/invoice-pdf.service";
import { getInvoiceById } from "@/modules/invoices/services/invoice.service";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const invoice = await getInvoiceById(params.id);
  if (!invoice) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  const buffer = await buildInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issuedAt: invoice.issuedAt,
    customerName: invoice.customer?.name ?? "Cliente general",
    customerNif: invoice.customer?.documentId ?? "-",
    customerAddress: "-",
    items: invoice.sale.items.map((item) => ({
      productName: item.product?.name ?? item.manualProductName ?? "Producto manual",
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal)
    })),
    subtotal: Number(invoice.sale.subtotal),
    discount: Number(invoice.sale.discountAmount),
    total: Number(invoice.sale.totalFinal),
    paymentMethod: invoice.sale.paymentMethod === "EFECTIVO" ? "Efectivo" : "Tarjeta"
  });

  await saveInvoicePdf(invoice.invoiceNumber, buffer);
  const fileName = buildInvoicePdfFileName(invoice.invoiceNumber);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`
    }
  });
}
