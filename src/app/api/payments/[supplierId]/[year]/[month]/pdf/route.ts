import { NextResponse } from "next/server";
import { buildMonthlySupplierPaymentPdf, buildPaymentPdfFileName } from "@/modules/payments/services/payment-pdf.service";
import { getMonthlySupplierPaymentReport } from "@/modules/payments/services/payment.service";

type Params = {
  supplierId: string;
  year: string;
  month: string;
};

export async function GET(_: Request, { params }: { params: Params }) {
  const year = Number(params.year);
  const month = Number(params.month);

  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Parametros invalidos." }, { status: 400 });
  }

  const report = await getMonthlySupplierPaymentReport(params.supplierId, year, month);
  if (!report) {
    return NextResponse.json({ error: "Proveedor no encontrado." }, { status: 404 });
  }

  const buffer = await buildMonthlySupplierPaymentPdf(report);
  const fileName = buildPaymentPdfFileName({
    supplierName: report.supplierName,
    year: report.year,
    month: report.month
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
