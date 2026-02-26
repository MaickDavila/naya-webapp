import type { Product } from "../../domain/entities/Product";
import type { CartItemData } from "../../domain/repositories/CartRepository";
import { Timestamp } from "firebase/firestore";
import type { ProductCondition, ProductStatus } from "../../domain/entities/Product";

/**
 * Mapea entre CartItem (Product + quantity) y el formato de persistencia en Firestore.
 * Guardamos una snapshot del producto al añadirlo al carrito.
 */
export class CartItemMapper {
  static toDomain(docId: string, data: Record<string, unknown>): Product & { quantity: number } {
    const quantity = (data.quantity as number) ?? 1;
    const product: Product = {
      id: docId,
      sellerId: (data.sellerId as string) || "",
      sellerName: (data.sellerName as string) || "",
      sellerEmail: (data.sellerEmail as string) || "",
      title: (data.title as string) || "",
      description: (data.description as string) || "",
      price: (data.price as number) ?? 0,
      originalPrice: data.originalPrice as number | undefined,
      currency: (data.currency as string) || "USD",
      category: (data.category as string) || "",
      subcategory: data.subcategory as string | undefined,
      condition: (data.condition as ProductCondition) || "buen_estado",
      images: (data.images as string[]) || [],
      status: (data.status as ProductStatus) || "approved",
      tags: (data.tags as string[]) || [],
      views: (data.views as number) ?? 0,
      favorites: (data.favorites as number) ?? 0,
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    };
    if (data.brand != null) product.brand = data.brand as string;
    if (data.size != null) product.size = data.size as string;
    if (data.color != null) product.color = data.color as string;
    if (data.material != null) product.material = data.material as string;
    return { ...product, quantity };
  }

  /**
   * Firestore no acepta `undefined`; solo incluimos campos con valor definido.
   */
  static toPersistence(item: Product & { quantity: number }): Record<string, unknown> & { productId: string; quantity: number } {
    const raw: Record<string, unknown> = {
      productId: item.id,
      quantity: item.quantity,
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      sellerEmail: item.sellerEmail,
      title: item.title,
      description: item.description,
      price: item.price,
      currency: item.currency,
      category: item.category,
      condition: item.condition,
      images: item.images,
      status: item.status,
      tags: item.tags ?? [],
      views: item.views ?? 0,
      favorites: item.favorites ?? 0,
      updatedAt: Timestamp.now(),
    };
    if (item.originalPrice != null) raw.originalPrice = item.originalPrice;
    if (item.subcategory != null) raw.subcategory = item.subcategory;
    if (item.brand != null) raw.brand = item.brand;
    if (item.size != null) raw.size = item.size;
    if (item.color != null) raw.color = item.color;
    if (item.material != null) raw.material = item.material;
    return raw as Record<string, unknown> & { productId: string; quantity: number };
  }

  private static toDate(val: unknown): Date {
    if (!val) return new Date();
    if (typeof (val as { toDate?: () => Date }).toDate === "function") {
      return (val as { toDate: () => Date }).toDate();
    }
    if (val instanceof Date) return val;
    return new Date(val as number | string);
  }
}
