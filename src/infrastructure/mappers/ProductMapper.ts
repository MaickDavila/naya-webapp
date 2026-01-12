import type { Product } from "../../domain/entities/Product";
import type { Timestamp } from "firebase/firestore/lite";

export class ProductMapper {
  /**
   * Mapea un documento de Firestore a la entidad de Dominio Product.
   * Maneja la conversión de Timestamps a Dates de JS.
   */
  static toDomain(id: string, data: any): Product {
    return {
      id,
      title: data.title || "",
      description: data.description || "",
      price: data.price || 0,
      images: data.images || [],
      category: data.category || "",
      sellerId: data.sellerId || "",
      status: data.status || "available",
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    };
  }

  /**
   * Mapea de la entidad de Dominio al formato de persistencia de Firestore.
   */
  static toPersistence(product: Partial<Product>) {
    const data: any = { ...product };
    delete data.id;
    return data;
  }

  private static toDate(timestamp: any): Date {
    if (!timestamp) return new Date();

    // Si es un Timestamp de Firebase (Client o Admin SDK)
    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate();
    }

    // Si ya es un Date
    if (timestamp instanceof Date) {
      return timestamp;
    }

    // Fallback: intentar convertir string/number
    return new Date(timestamp);
  }
}
