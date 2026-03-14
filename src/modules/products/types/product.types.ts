export type ProductListItem = {
  id: string;
  name: string;
  price: number;
  currentStock: number;
  supplier: {
    id: string;
    name: string;
  };
};
