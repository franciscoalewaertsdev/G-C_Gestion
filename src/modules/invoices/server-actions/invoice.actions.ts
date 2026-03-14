"use server";

import { revalidateTag } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { generateInvoiceNumber } from "@/lib/invoice-number";
import { sendInvoiceEmail } from "@/modules/invoices/services/emailService";
import {
  buildInvoicePdf,
  buildInvoicePdfFileName,
  saveInvoicePdf
} from "@/modules/invoices/services/invoice-pdf.service";
import { createInvoiceForSale, deleteInvoice, getInvoiceById } from "@/modules/invoices/services/invoice.service";

export async function generateInvoiceNumberAction() {
  return generateInvoiceNumber();
}

export async function generateInvoiceAction(saleId: string, customerId?: string) {
  const invoice = await createInvoiceForSale(saleId, customerId);
  revalidateTag("invoices");
  revalidateTag("reports");
  return invoice;
}

export async function deleteInvoiceAction(id: string) {
  await deleteInvoice(id);
  revalidateTag("invoices");
  revalidateTag("reports");
}

export async function sendInvoiceEmailAction(payload: { invoiceId: string; customerEmail: string }) {
  await requireSession();

  const email = payload.customerEmail.trim().toLowerCase();
  if (!email) {
    throw new Error("Debes ingresar un email valido para enviar la factura.");
  }

  const invoice = await getInvoiceById(payload.invoiceId);
  if (!invoice) {
    throw new Error("Factura no encontrada.");
  }

  const pdf = await buildInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issuedAt: invoice.issuedAt,
    customerName: invoice.customer?.name ?? "Cliente general",
    customerNif: invoice.customer?.documentId ?? "-",
    customerAddress: "-",
    items: invoice.sale.items.map((item) => ({
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal)
    })),
    subtotal: Number(invoice.sale.subtotal),
    discount: Number(invoice.sale.discountAmount),
    total: Number(invoice.sale.totalFinal),
    paymentMethod: invoice.sale.paymentMethod === "EFECTIVO" ? "Efectivo" : "Tarjeta"
  });

  await saveInvoicePdf(invoice.invoiceNumber, pdf);
  const fileName = buildInvoicePdfFileName(invoice.invoiceNumber);

  await sendInvoiceEmail(email, invoice.invoiceNumber, fileName, pdf);

  return {
    ok: true,
    invoiceId: invoice.id,
    email
  };
}
