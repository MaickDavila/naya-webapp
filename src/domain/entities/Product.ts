export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  sellerId: string;
  status: "available" | "sold" | "reserved";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDTO
  extends Omit<Product, "id" | "createdAt" | "updatedAt"> {}
