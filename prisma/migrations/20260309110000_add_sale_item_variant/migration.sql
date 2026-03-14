-- Add optional variant reference to sale items so sales can discount exact size stock.
ALTER TABLE "SaleItem"
ADD COLUMN "variantId" TEXT;

CREATE INDEX "SaleItem_variantId_idx" ON "SaleItem"("variantId");

ALTER TABLE "SaleItem"
ADD CONSTRAINT "SaleItem_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
