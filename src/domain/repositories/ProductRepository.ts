import type { Product, ProductStatus } from '../entities/Product';

/**
 * Filtros para búsqueda de productos
 */
export interface ProductSearchFilters {
  category?: string;
  query?: string;
  status?: ProductStatus;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Interfaz del repositorio de productos
 * Define las operaciones disponibles para gestionar productos
 */
export interface ProductRepository {
  /**
   * Obtiene los productos más recientes
   */
  getLatest(limit: number): Promise<Product[]>;
  
  /**
   * Obtiene un producto por su ID
   */
  getById(id: string): Promise<Product | null>;
  
  /**
   * Obtiene todos los productos de un vendedor
   */
  getBySellerId(sellerId: string): Promise<Product[]>;
  
  /**
   * Busca productos con filtros
   */
  search(filters: ProductSearchFilters): Promise<Product[]>;
  
  /**
   * Obtiene productos aprobados (visibles públicamente)
   */
  getApproved(limit?: number): Promise<Product[]>;
  
  /**
   * Obtiene productos pendientes de aprobación
   */
  getPending(): Promise<Product[]>;
  
  /**
   * Crea un nuevo producto
   */
  create(product: Omit<Product, 'id'>): Promise<string>;
  
  /**
   * Actualiza un producto existente
   */
  update(id: string, product: Partial<Product>): Promise<void>;
  
  /**
   * Elimina un producto
   */
  delete(id: string): Promise<void>;
}
