import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
}

export class ImageCompressionService {
  private static defaultOptions: CompressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    quality: 0.8,
  };

  static async compressImage(
    file: File,
    options: Partial<CompressionOptions> = {}
  ): Promise<File> {
    const compressionOptions = {
      ...this.defaultOptions,
      ...options,
    };

    try {
      const compressedFile = await imageCompression(
        file,
        compressionOptions
      );
      
      console.log(
        `Imagen comprimida: ${file.name} - Original: ${(file.size / 1024 / 1024).toFixed(2)}MB, Comprimida: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
      );
      
      return compressedFile;
    } catch (error) {
      console.error('Error al comprimir imagen:', error);
      throw new Error('No se pudo comprimir la imagen');
    }
  }

  static async compressMultipleImages(
    files: File[],
    options: Partial<CompressionOptions> = {}
  ): Promise<File[]> {
    const compressedFiles: File[] = [];
    
    for (const file of files) {
      try {
        const compressed = await this.compressImage(file, options);
        compressedFiles.push(compressed);
      } catch (error) {
        console.error(`Error al comprimir ${file.name}:`, error);
        // Si falla la compresión, usamos el archivo original
        compressedFiles.push(file);
      }
    }
    
    return compressedFiles;
  }

  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Solo se permiten archivos JPG, PNG o WebP',
      };
    }

    // Validar tamaño (máximo 5MB)
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      return {
        valid: false,
        error: `El tamaño máximo es ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  }

  static generatePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}