"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportReportExcelAction, exportReportPdfAction } from "@/modules/reports/server-actions/report.actions";
import { ReportType } from "@/modules/reports/types/report.types";

function downloadBase64(base64: string, contentType: string, fileName: string) {
  const link = document.createElement("a");
  link.href = `data:${contentType};base64,${base64}`;
  link.download = fileName;
  link.click();
}

export function ReportExportPanel({ reportType }: { reportType: ReportType }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const file = await exportReportPdfAction(reportType);
            downloadBase64(file.base64, file.contentType, file.fileName);
          });
        }}
      >
        Exportar PDF
      </Button>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const file = await exportReportExcelAction(reportType);
            downloadBase64(file.base64, file.contentType, file.fileName);
          });
        }}
      >
        Exportar Excel
      </Button>
    </div>
  );
}
