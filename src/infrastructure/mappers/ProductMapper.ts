import type { Product, ProductCondition, ProductStatus } from "../../domain/entities/Product";
import type { Timestamp } from "firebase/firestore";

/**
 * Mapper para convertir entre datos de Firestore y entidad Product
 * Compatible con la estructura del admin/backend
 */
export class ProductMapper {
  /**
   * Mapea un documento de Firestore a la entidad de Dominio Product.
   * Maneja la conversión de Timestamps a Dates de JS.
   */
  static toDomain(id: string, data: any): Product {
    return {
      id,
      
      // Información del vendedor
      sellerId: data.sellerId || "",
      sellerName: data.sellerName || "",
      sellerEmail: data.sellerEmail || "",
      
      // Información básica
      title: data.title || "",
      description: data.description || "",
      price: data.price || 0,
      originalPrice: data.originalPrice,
      currency: data.currency || "USD",
      
      // Categorización
      category: data.category || "",
      subcategory: data.subcategory,
      
      // Características
      condition: data.condition as ProductCondition,
      brand: data.brand,
      size: data.size,
      color: data.color,
      material: data.material,
      
      // Imágenes
      images: data.images || [],
      
      // Estado y moderación
      status: (data.status as ProductStatus) || "pending",
      moderationNotes: data.moderationNotes,
      moderatedBy: data.moderatedBy,
      moderatedAt: data.moderatedAt ? this.toDate(data.moderatedAt) : undefined,
      
      // Búsqueda y etiquetas
      tags: data.tags || [],
      
      // Ubicación
      location: data.location,
      
      // Información de venta
      soldAt: data.soldAt ? this.toDate(data.soldAt) : undefined,
      soldToUserId: data.soldToUserId,
      soldToUserName: data.soldToUserName,
      
      // Fechas
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
      publishedAt: data.publishedAt ? this.toDate(data.publishedAt) : undefined,
      expiresAt: data.expiresAt ? this.toDate(data.expiresAt) : undefined,
      
      // Estadísticas
      views: data.views || 0,
      favorites: data.favorites || 0,
    };
  }

  /**
   * Mapea de la entidad de Dominio al formato de persistencia de Firestore.
   * Este método prepara los datos para ser guardados en Firestore.
   */
  static toPersistence(product: Partial<Product>): Record<string, any> {
    const data: Record<string, any> = {};
    
    // Copiar solo los campos definidos (no undefined)
    if (product.sellerId !== undefined) data.sellerId = product.sellerId;
    if (product.sellerName !== undefined) data.sellerName = product.sellerName;
    if (product.sellerEmail !== undefined) data.sellerEmail = product.sellerEmail;
    
    if (product.title !== undefined) data.title = product.title;
    if (product.description !== undefined) data.description = product.description;
    if (product.price !== undefined) data.price = product.price;
    if (product.originalPrice !== undefined) data.originalPrice = product.originalPrice;
    if (product.currency !== undefined) data.currency = product.currency;
    
    if (product.category !== undefined) data.category = product.category;
    if (product.subcategory !== undefined) data.subcategory = product.subcategory;
    
    if (product.condition !== undefined) data.condition = product.condition;
    if (product.brand !== undefined) data.brand = product.brand;
    if (product.size !== undefined) data.size = product.size;
    if (product.color !== undefined) data.color = product.color;
    if (product.material !== undefined) data.material = product.material;
    
    if (product.images !== undefined) data.images = product.images;
    
    if (product.status !== undefined) data.status = product.status;
    if (product.moderationNotes !== undefined) data.moderationNotes = product.moderationNotes;
    if (product.moderatedBy !== undefined) data.moderatedBy = product.moderatedBy;
    if (product.moderatedAt !== undefined) data.moderatedAt = product.moderatedAt;
    
    if (product.tags !== undefined) data.tags = product.tags;
    if (product.location !== undefined) data.location = product.location;
    
    if (product.soldAt !== undefined) data.soldAt = product.soldAt;
    if (product.soldToUserId !== undefined) data.soldToUserId = product.soldToUserId;
    if (product.soldToUserName !== undefined) data.soldToUserName = product.soldToUserName;
    
    if (product.publishedAt !== undefined) data.publishedAt = product.publishedAt;
    if (product.expiresAt !== undefined) data.expiresAt = product.expiresAt;
    
    if (product.views !== undefined) data.views = product.views;
    if (product.favorites !== undefined) data.favorites = product.favorites;
    
    return data;
  }

  /**
   * Convierte un valor a Date de JavaScript
   */
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
  
  /**
   * Convierte una fecha opcional a Date o undefined
   */
  private static toDateOptional(timestamp: any): Date | undefined {
    if (!timestamp) return undefined;
    return this.toDate(timestamp);
  }
}
