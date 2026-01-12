import type { Category } from '../../domain/entities/Category';
import type { Timestamp } from 'firebase/firestore';

export class CategoryMapper {
  static toDomain(id: string, data: any): Category {
    return {
      id,
      name: data.name || '',
      slug: data.slug || '',
      description: data.description || null,
      icon: data.icon || null,
      color: data.color || null,
      order: data.order || 0,
      active: data.active ?? true,
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
      productsCount: data.productsCount || 0,
    };
  }

  static toPersistence(category: Partial<Category>): any {
    const data: any = { ...category };
    delete data.id;
    return data;
  }

  private static toDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    return new Date(timestamp);
  }
}
