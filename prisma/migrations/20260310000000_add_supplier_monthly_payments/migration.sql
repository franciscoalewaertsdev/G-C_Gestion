CREATE TABLE "SupplierMonthlyPayment" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "isPaid" BOOLEAN NOT NULL DEFAULT false,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupplierMonthlyPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierMonthlyPayment_supplierId_year_month_key"
ON "SupplierMonthlyPayment"("supplierId", "year", "month");

CREATE INDEX "SupplierMonthlyPayment_year_month_idx"
ON "SupplierMonthlyPayment"("year", "month");

ALTER TABLE "SupplierMonthlyPayment"
ADD CONSTRAINT "SupplierMonthlyPayment_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
