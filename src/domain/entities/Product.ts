/**
 * Condición del producto - Compatible con admin
 */
export type ProductCondition =
  | "nuevo"
  | "como_nuevo"
  | "buen_estado"
  | "regular"
  | "necesita_reparacion";

/**
 * Mapeo de condiciones (UI -> Backend)
 * Útil para el formulario de venta
 */
export const CONDITION_MAP: Record<string, ProductCondition> = {
  new: "nuevo",
  like_new: "como_nuevo",
  good: "buen_estado",
  fair: "regular",
  poor: "necesita_reparacion",
};

/**
 * Mapeo inverso de condiciones (Backend -> UI)
 */
export const CONDITION_LABELS: Record<ProductCondition, string> = {
  nuevo: "Nuevo",
  como_nuevo: "Como nuevo",
  buen_estado: "Buen estado",
  regular: "Regular",
  necesita_reparacion: "Necesita reparación",
};

/**
 * Estado del producto - Compatible con admin
 * Este es el estado de MODERACIÓN/LIFECYCLE del producto
 */
export type ProductStatus =
  | "pending"    // Pendiente de aprobación
  | "approved"   // Aprobado y visible
  | "rejected"   // Rechazado por moderación
  | "sold"       // Vendido
  | "expired"    // Expirado
  | "draft";     // Borrador (no enviado a revisión)

/**
 * Ubicación del producto (opcional)
 */
export interface ProductLocation {
  city: string;
  state: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Modelo de Producto - Compatible con admin/backend
 */
export interface Product {
  id: string;
  
  // Información del vendedor
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  
  // Información básica
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  
  // Categorización
  category: string;
  subcategory?: string;
  
  // Características
  condition: ProductCondition;
  sku?: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  
  // Imágenes
  images: string[];
  
  // Estado y moderación
  status: ProductStatus;
  moderationNotes?: string;
  moderatedBy?: string;
  moderatedAt?: Date;
  
  // Búsqueda y etiquetas
  tags: string[];
  
  // Ubicación (opcional)
  location?: ProductLocation;
  
  // Información de venta
  soldAt?: Date;
  soldToUserId?: string;
  soldToUserName?: string;
  
  // Fechas
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  expiresAt?: Date;
  
  // Estadísticas
  views: number;
  favorites: number;
}

/**
 * DTO para crear un producto desde la web-app
 */
export interface CreateProductDTO {
  // Requeridos
  title: string;
  description: string;
  price: number;
  category: string;
  condition: ProductCondition;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  images: string[];
  
  // Opcionales
  originalPrice?: number;
  currency?: string;
  subcategory?: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  tags?: string[];
  location?: ProductLocation;
}

/**
 * DTO para actualizar un producto
 */
export type UpdateProductDTO = Partial<Omit<Product, "id" | "createdAt" | "sellerId">>;
