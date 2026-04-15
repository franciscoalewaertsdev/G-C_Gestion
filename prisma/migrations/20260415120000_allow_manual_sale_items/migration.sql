-- Allow manual sale items without linked product records.
ALTER TABLE "SaleItem" ALTER COLUMN "productId" DROP NOT NULL;

ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_productId_fkey";

ALTER TABLE "SaleItem"
ADD CONSTRAINT "SaleItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SaleItem"
ADD COLUMN "manualProductName" TEXT;