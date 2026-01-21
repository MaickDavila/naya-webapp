import type { Product, ProductCondition } from '../../domain/entities/Product';
import { CONDITION_MAP } from '../../domain/entities/Product';
import type { ProductRepository } from '../../domain/repositories/ProductRepository';
import { ImageCompressionService } from '../../infrastructure/services/ImageCompressionService';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Request para actualizar un producto desde el formulario de la web-app
 */
export interface UpdateProductRequest {
  // ID del producto a actualizar
  productId: string;
  
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
  
  // Imágenes existentes (URLs que se mantienen)
  existingImages: string[];
  
  // Nuevas imágenes (archivos para subir)
  newImages: File[];
  
  // Información del vendedor (para verificación)
  sellerId: string;
  
  // Opcionales
  tags?: string[];
}

export interface UpdateProductResponse {
  product: Product;
  success: boolean;
  message: string;
}

/**
 * Caso de uso para actualizar un producto desde la web-app
 */
export class UpdateProductUseCase {
  constructor(
    private productRepository: ProductRepository,
    private imageCompressionService: typeof ImageCompressionService
  ) {}

  async execute(request: UpdateProductRequest): Promise<UpdateProductResponse> {
    try {
      // 1. Verificar que el producto existe
      const existingProduct = await this.productRepository.getById(request.productId);
      if (!existingProduct) {
        throw new Error('El producto no existe');
      }

      // 2. Verificar que el usuario es el dueño del producto
      if (existingProduct.sellerId !== request.sellerId) {
        throw new Error('No tienes permiso para editar este producto');
      }

      // 3. Validar datos de entrada
      this.validateRequest(request);

      // 4. Procesar nuevas imágenes si las hay
      let allImageUrls = [...request.existingImages];
      
      if (request.newImages.length > 0) {
        const newImageUrls = await this.processImages(request.newImages, request.sellerId);
        allImageUrls = [...allImageUrls, ...newImageUrls];
      }

      // 5. Validar que hay al menos una imagen
      if (allImageUrls.length === 0) {
        throw new Error('Debes tener al menos una imagen');
      }

      // 6. Convertir condición del formulario al formato del backend
      const backendCondition = this.mapConditionToBackend(request.condition);

      // 7. Generar tags automáticos basados en el producto
      const generatedTags = this.generateTags(request);

      // 8. Determinar el nuevo estado del producto
      // Si estaba rechazado y se edita, vuelve a pending para revisión
      // Si estaba aprobado, se mantiene aprobado (edición menor)
      // Si estaba pending, se mantiene pending
      let newStatus = existingProduct.status;
      if (existingProduct.status === 'rejected') {
        newStatus = 'pending';
      }

      // 9. Preparar datos de actualización
      const updateData: Partial<Product> = {
        // Información básica
        title: request.title.trim(),
        description: request.description.trim(),
        price: request.price,
        originalPrice: request.originalPrice,
        
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
        images: allImageUrls,
        
        // Estado
        status: newStatus,
        
        // Si vuelve a pending, limpiar notas de moderación
        ...(newStatus === 'pending' && existingProduct.status === 'rejected' ? {
          moderationNotes: undefined,
        } : {}),
        
        // Tags para búsqueda
        tags: generatedTags,
        
        // Fecha de actualización
        updatedAt: new Date(),
      };

      // 10. Actualizar producto en la base de datos
      await this.productRepository.update(request.productId, updateData);

      // 11. Obtener producto actualizado
      const updatedProduct = await this.productRepository.getById(request.productId);
      if (!updatedProduct) {
        throw new Error('Error al obtener el producto actualizado');
      }

      // 12. Preparar mensaje según el estado
      let message = 'Producto actualizado exitosamente.';
      if (existingProduct.status === 'rejected' && newStatus === 'pending') {
        message = 'Producto actualizado y reenviado a revisión. Recibirás una notificación cuando sea aprobado.';
      }

      return {
        product: updatedProduct,
        success: true,
        message,
      };

    } catch (error) {
      console.error('Error en UpdateProductUseCase:', error);
      
      let message = 'Error al actualizar el producto';
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
  private generateTags(request: UpdateProductRequest): string[] {
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

  private validateRequest(request: UpdateProductRequest): void {
    // Validaciones básicas
    if (!request.productId) {
      throw new Error('El ID del producto es requerido');
    }

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

    // Validar que hay al menos una imagen (existente o nueva)
    const totalImages = request.existingImages.length + request.newImages.length;
    if (totalImages === 0) {
      throw new Error('Debes tener al menos una imagen');
    }

    if (totalImages > 8) {
      throw new Error('No puedes tener más de 8 imágenes');
    }

    // Validar archivos de imagen nuevos
    for (const file of request.newImages) {
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
}
