import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { sendInvoiceEmail } from "@/modules/invoices/services/emailService";
import {
  buildInvoicePdf,
  buildInvoicePdfFileName,
  saveInvoicePdf
} from "@/modules/invoices/services/invoice-pdf.service";
import { getInvoiceById } from "@/modules/invoices/services/invoice.service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { customerEmail?: string };
    const customerEmail = body.customerEmail?.trim().toLowerCase();

    if (!customerEmail) {
      return NextResponse.json({ error: "customerEmail es requerido" }, { status: 400 });
    }

    const invoice = await getInvoiceById(params.id);
    if (!invoice) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }

    const invoicePdf = await buildInvoicePdf({
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

    await saveInvoicePdf(invoice.invoiceNumber, invoicePdf);
    const fileName = buildInvoicePdfFileName(invoice.invoiceNumber);

    const result = await sendInvoiceEmail(customerEmail, invoice.invoiceNumber, fileName, invoicePdf);

    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
