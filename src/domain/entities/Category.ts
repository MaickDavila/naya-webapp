export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  productsCount: number;
}
