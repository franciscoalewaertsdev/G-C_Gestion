-- AlterTable
ALTER TABLE "StockEntryItem" ADD COLUMN     "variantId" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "StockEntryItem_variantId_idx" ON "StockEntryItem"("variantId");

-- AddForeignKey
ALTER TABLE "StockEntryItem" ADD CONSTRAINT "StockEntryItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
