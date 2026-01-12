import type { Category } from '../entities/Category';

export interface CategoryRepository {
  getAll(): Promise<Category[]>;
  getActive(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  getBySlug(slug: string): Promise<Category | null>;
}
