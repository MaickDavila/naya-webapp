import type { Product, ProductCondition, CreateProductDTO } from '../../domain/entities/Product';
import { CONDITION_MAP } from '../../domain/entities/Product';
import type { ProductRepository } from '../../domain/repositories/ProductRepository';
import { ImageCompressionService } from '../../infrastructure/services/ImageCompressionService';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Request para crear un producto desde el formulario de la web-app
 */
export interface CreateProductRequest {
  // Información básica
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  
  // Categorización
  category: string;
  subcategory?: string;
  
  // Características
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor'; // Valores del formulario UI
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  
  // Imágenes (archivos para subir)
  images: File[];
  
  // Información del vendedor
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  
  // Opcionales
  tags?: string[];
  location?: {
    city: string;
    state: string;
    country: string;
  };
}

export interface CreateProductResponse {
  product: Product;
  success: boolean;
  message: string;
}

/**
 * Caso de uso para crear un producto desde la web-app
 * Genera productos compatibles con el backend/admin
 */
export class CreateProductUseCase {
  constructor(
    private productRepository: ProductRepository,
    private imageCompressionService: typeof ImageCompressionService
  ) {}

  async execute(request: CreateProductRequest): Promise<CreateProductResponse> {
    try {
      // 1. Validar datos de entrada
      this.validateRequest(request);

      // 2. Procesar imágenes (compresión y subida)
      const imageUrls = await this.processImages(request.images, request.sellerId);

      // 3. Convertir condición del formulario al formato del backend
      const backendCondition = this.mapConditionToBackend(request.condition);

      // 4. Generar tags automáticos basados en el producto
      const generatedTags = this.generateTags(request);

      // 5. Crear producto para la base de datos (compatible con admin)
      const productData: Omit<Product, 'id'> = {
        // Información del vendedor
        sellerId: request.sellerId,
        sellerName: request.sellerName,
        sellerEmail: request.sellerEmail,
        
        // Información básica
        title: request.title.trim(),
        description: request.description.trim(),
        price: request.price,
        originalPrice: request.originalPrice,
        currency: 'USD', // Moneda por defecto
        
        // Categorización
        category: request.category,
        subcategory: request.subcategory,
        
        // Características
        condition: backendCondition,
        brand: request.brand?.trim() || undefined,
        size: request.size || undefined,
        color: request.color?.trim() || undefined,
        material: request.material?.trim() || undefined,
        
        // Imágenes
        images: imageUrls,
        
        // Estado inicial: pendiente de aprobación por admin
        status: 'pending',
        moderationNotes: undefined,
        moderatedBy: undefined,
        moderatedAt: undefined,
        
        // Tags para búsqueda
        tags: generatedTags,
        
        // Ubicación (opcional)
        location: request.location,
        
        // Información de venta (inicialmente vacía)
        soldAt: undefined,
        soldToUserId: undefined,
        soldToUserName: undefined,
        
        // Fechas
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: undefined, // Se establecerá cuando sea aprobado
        expiresAt: undefined,   // Se establecerá cuando sea aprobado
        
        // Estadísticas iniciales
        views: 0,
        favorites: 0,
      };

      // 6. Crear producto en la base de datos
      const productId = await this.productRepository.create(productData);

      // 7. Obtener producto creado
      const createdProduct = await this.productRepository.getById(productId);
      if (!createdProduct) {
        throw new Error('Error al obtener el producto creado');
      }

      return {
        product: createdProduct,
        success: true,
        message: 'Producto creado exitosamente y enviado a revisión. Recibirás una notificación cuando sea aprobado.',
      };

    } catch (error) {
      console.error('Error en CreateProductUseCase:', error);
      
      let message = 'Error al crear el producto';
      if (error instanceof Error) {
        message = error.message;
      }

      return {
        product: {} as Product,
        success: false,
        message,
      };
    }
  }

  /**
   * Convierte la condición del formulario UI al formato del backend
   */
  private mapConditionToBackend(uiCondition: string): ProductCondition {
    const mapped = CONDITION_MAP[uiCondition];
    if (!mapped) {
      console.warn(`Condición no reconocida: ${uiCondition}, usando 'buen_estado' por defecto`);
      return 'buen_estado';
    }
    return mapped;
  }

  /**
   * Genera tags automáticos basados en la información del producto
   */
  private generateTags(request: CreateProductRequest): string[] {
    const tags: string[] = [];
    
    // Agregar categoría como tag
    if (request.category) {
      tags.push(request.category.toLowerCase());
    }
    
    // Agregar subcategoría como tag
    if (request.subcategory) {
      tags.push(request.subcategory.toLowerCase());
    }
    
    // Agregar marca como tag
    if (request.brand) {
      tags.push(request.brand.toLowerCase().trim());
    }
    
    // Agregar talla como tag
    if (request.size) {
      tags.push(`talla-${request.size.toLowerCase()}`);
    }
    
    // Agregar color como tag
    if (request.color) {
      tags.push(request.color.toLowerCase().trim());
    }
    
    // Extraer palabras clave del título (más de 3 caracteres)
    const titleWords = request.title
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));
    tags.push(...titleWords.slice(0, 5)); // Máximo 5 palabras del título
    
    // Agregar tags personalizados si los hay
    if (request.tags) {
      tags.push(...request.tags.map(t => t.toLowerCase().trim()));
    }
    
    // Eliminar duplicados y retornar
    return [...new Set(tags)];
  }

  /**
   * Verifica si una palabra es una stop word (palabras comunes sin valor semántico)
   */
  private isStopWord(word: string): boolean {
    const stopWords = ['para', 'como', 'esta', 'este', 'esos', 'esas', 'muy', 'poco', 'mucho', 'con', 'sin'];
    return stopWords.includes(word);
  }

  private validateRequest(request: CreateProductRequest): void {
    // Validaciones básicas
    if (!request.title || request.title.trim().length < 3) {
      throw new Error('El título debe tener al menos 3 caracteres');
    }

    if (!request.description || request.description.trim().length < 10) {
      throw new Error('La descripción debe tener al menos 10 caracteres');
    }

    if (!request.price || request.price <= 0) {
      throw new Error('El precio debe ser mayor a 0');
    }

    if (request.originalPrice && request.originalPrice < request.price) {
      throw new Error('El precio original no puede ser menor al precio actual');
    }

    if (!request.category) {
      throw new Error('La categoría es requerida');
    }

    if (!request.condition) {
      throw new Error('La condición del producto es requerida');
    }

    if (!request.sellerId) {
      throw new Error('El ID del vendedor es requerido');
    }
    
    if (!request.sellerName) {
      throw new Error('El nombre del vendedor es requerido');
    }
    
    if (!request.sellerEmail) {
      throw new Error('El email del vendedor es requerido');
    }

    if (!request.images || request.images.length === 0) {
      throw new Error('Debes agregar al menos una imagen');
    }

    if (request.images.length > 8) {
      throw new Error('No puedes agregar más de 8 imágenes');
    }

    // Validar archivos de imagen
    for (const file of request.images) {
      const validation = ImageCompressionService.validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
    }
  }

  private async processImages(files: File[], sellerId: string): Promise<string[]> {
    const imageUrls: string[] = [];

    for (const file of files) {
      try {
        // 1. Comprimir imagen
        const compressedFile = await ImageCompressionService.compressImage(file);

        // 2. Subir a Firebase Storage
        const imageUrl = await this.uploadImageToStorage(compressedFile, sellerId);
        
        imageUrls.push(imageUrl);
      } catch (error) {
        console.error(`Error al procesar imagen ${file.name}:`, error);
        throw new Error(`Error al procesar la imagen ${file.name}`);
      }
    }

    return imageUrls;
  }

  private async uploadImageToStorage(file: File, sellerId: string): Promise<string> {
    if (!storage) {
      throw new Error('Firebase Storage no está inicializado');
    }

    try {
      // Generar nombre único para el archivo
      // Organizar por sellerId para mejor gestión
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const filename = `products/${sellerId}/${timestamp}_${randomId}.${fileExtension}`;
      
      // Crear referencia al archivo en Storage
      const storageRef = ref(storage, filename);
      
      // Subir el archivo
      const snapshot = await uploadBytes(storageRef, file);
      
      // Obtener la URL de descarga
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error al subir imagen a Firebase Storage:', error);
      throw new Error('No se pudo subir la imagen a Firebase Storage');
    }
  }

  /**
   * Método para actualizar el estado de moderación (llamado desde admin o webhook)
   */
  async updateModerationStatus(
    productId: string, 
    status: 'approved' | 'rejected', 
    moderatorId: string,
    notes?: string
  ): Promise<void> {
    try {
      const now = new Date();
      const updateData: Partial<Product> = {
        status: status,
        moderatedBy: moderatorId,
        moderatedAt: now,
        updatedAt: now,
      };

      if (notes) {
        updateData.moderationNotes = notes;
      }

      // Si es aprobado, establecer fecha de publicación y expiración
      if (status === 'approved') {
        updateData.publishedAt = now;
        // Expirar en 30 días por defecto
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + 30);
        updateData.expiresAt = expiresAt;
      }

      await this.productRepository.update(productId, updateData);

      // Acciones post-moderación
      if (status === 'approved') {
        await this.handleProductApproved(productId);
      } else {
        await this.handleProductRejected(productId, notes);
      }

    } catch (error) {
      console.error('Error al actualizar estado de moderación:', error);
      throw error;
    }
  }

  private async handleProductApproved(productId: string): Promise<void> {
    // TODO: Implementar notificación al vendedor
    // TODO: Actualizar estadísticas de la plataforma
    console.log(`Producto ${productId} aprobado y publicado`);
  }

  private async handleProductRejected(productId: string, reason?: string): Promise<void> {
    // TODO: Implementar notificación al vendedor con razón de rechazo
    console.log(`Producto ${productId} rechazado. Razón: ${reason || 'No especificada'}`);
  }
}