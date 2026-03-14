"use client";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InvoiceActions({ invoiceId }: { invoiceId: string }) {
  return (
    <div className="mb-4 flex gap-2 print:hidden">
      <Button variant="outline" onClick={() => window.print()}>
        Imprimir
      </Button>
      <a
        href={`/api/invoices/${invoiceId}/pdf`}
        target="_blank"
        rel="noreferrer"
        className={cn(buttonVariants({ variant: "default" }))}
      >
        Descargar PDF
      </a>
    </div>
  );
}
