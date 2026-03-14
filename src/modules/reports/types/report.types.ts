export type ReportType = "sales" | "stock" | "suppliers" | "invoices";

export type ExportResult = {
  fileName: string;
  contentType: string;
  base64: string;
};
