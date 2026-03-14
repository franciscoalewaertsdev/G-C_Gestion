export type DiscountType = "NONE" | "PERCENTAGE" | "FIXED";

export type DiscountCalculation = {
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  totalFinal: number;
};
