import type { Product } from '../entities/Product';

export interface ProductRepository {
  getLatest(limit: number): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  getBySellerId(sellerId: string): Promise<Product[]>;
  search(filters: { category?: string; query?: string }): Promise<Product[]>;
  create(product: Omit<Product, 'id'>): Promise<string>;
  update(id: string, product: Partial<Product>): Promise<void>;
  delete(id: string): Promise<void>;
}
