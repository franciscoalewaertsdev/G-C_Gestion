import { notFound } from "next/navigation";
import { InvoiceActions } from "@/modules/invoices/components/invoice-actions";
import { InvoicePrintTemplate } from "@/modules/invoices/components/invoice-print-template";
import { getInvoiceById } from "@/modules/invoices/services/invoice.service";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = await getInvoiceById(params.id);
  if (!invoice) {
    notFound();
  }

  return (
    <div>
      <InvoiceActions invoiceId={invoice.id} />
      <InvoicePrintTemplate
        invoiceNumber={invoice.invoiceNumber}
          issuedAt={new Date(invoice.issuedAt).toISOString()}
        clientName={invoice.customer?.name ?? "Cliente general"}
        clientNif={invoice.customer?.documentId ?? "-"}
        clientAddress={"-"}
        items={invoice.sale.items.map((item) => ({
          productName: item.product?.name ?? item.manualProductName ?? "Producto manual",
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal)
        }))}
        subtotal={Number(invoice.sale.subtotal)}
        discount={Number(invoice.sale.discountAmount)}
        total={Number(invoice.sale.totalFinal)}
        paymentMethod={invoice.sale.paymentMethod === "EFECTIVO" ? "Efectivo" : "Tarjeta"}
      />
    </div>
  );
}
