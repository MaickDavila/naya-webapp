<script setup lang="ts">
import { ref, computed } from 'vue';
import { ImageCompressionService } from '../../infrastructure/services/ImageCompressionService';

interface Props {
  modelValue: string[];
  maxImages?: number;
  disabled?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void;
  (e: 'error', error: string): void;
  (e: 'files-updated', files: File[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  maxImages: 8,
});

const emit = defineEmits<Emits>();

const fileInput = ref<HTMLInputElement>();
const isDragging = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const previewImages = ref<string[]>([...props.modelValue]);
const originalFiles = ref<File[]>([]);

const canAddMore = computed(() => 
  previewImages.value.length < props.maxImages && !props.disabled
);

const remainingSlots = computed(() => 
  props.maxImages - previewImages.value.length
);

// Métodos
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  
  if (files.length === 0) return;
  
  await processFiles(files);
  
  // Limpiar el input para permitir seleccionar el mismo archivo
  target.value = '';
};

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;
  
  const files = Array.from(event.dataTransfer?.files || []);
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length === 0) {
    emit('error', 'Por favor selecciona solo archivos de imagen');
    return;
  }
  
  await processFiles(imageFiles);
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (!props.disabled) {
    isDragging.value = true;
  }
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const processFiles = async (files: File[]) => {
  if (files.length > remainingSlots.value) {
    emit('error', `Solo puedes agregar ${remainingSlots.value} imágenes más`);
    return;
  }
  
  // Validar archivos
  for (const file of files) {
    const validation = ImageCompressionService.validateImageFile(file);
    if (!validation.valid) {
      emit('error', validation.error!);
      return;
    }
  }
  
  isUploading.value = true;
  uploadProgress.value = 0;
  
  try {
    // Guardar archivos originales
    originalFiles.value = [...originalFiles.value, ...files];
    emit('files-updated', originalFiles.value);
    
    // Generar previsualizaciones inmediatas (antes de comprimir)
    const immediatePreviews: string[] = [];
    for (const file of files) {
      const preview = await ImageCompressionService.generatePreview(file);
      immediatePreviews.push(preview);
    }
    
    // Mostrar previsualizaciones inmediatas
    const newImages = [...previewImages.value, ...immediatePreviews];
    previewImages.value = newImages;
    emit('update:modelValue', newImages);
    
    uploadProgress.value = 50;
    
    // Comprimir imágenes en segundo plano
    const compressedFiles = await ImageCompressionService.compressMultipleImages(files);
    uploadProgress.value = 75;
    
    // Subir a Firebase Storage (aquí iría la lógica real)
    const uploadedUrls = await uploadToFirebase(compressedFiles);
    uploadProgress.value = 100;
    
    // Reemplazar con URLs finales (para producción)
    // Por ahora mantenemos las data URLs que funcionan
    
  } catch (error) {
    console.error('Error al procesar imágenes:', error);
    emit('error', 'Error al procesar las imágenes');
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

const uploadToFirebase = async (files: File[]): Promise<string[]> => {
  // Simulación de subida a Firebase Storage
  // En una implementación real, aquí iría la lógica de subida
  
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    // Simular delay de subida
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Para desarrollo, usamos data URLs directamente para que las imágenes se vean
    const file = files[i];
    const dataUrl = await ImageCompressionService.generatePreview(file);
    urls.push(dataUrl);
  }
  
  return urls;
};

const removeImage = (index: number) => {
  const newImages = previewImages.value.filter((_, i) => i !== index);
  previewImages.value = newImages;
  emit('update:modelValue', newImages);
  
  // También eliminar el archivo original correspondiente
  const newFiles = originalFiles.value.filter((_, i) => i !== index);
  originalFiles.value = newFiles;
  emit('files-updated', newFiles);
};

const triggerFileSelect = () => {
  if (!props.disabled && fileInput.value) {
    fileInput.value.click();
  }
};

// Clases CSS dinámicas
const dropZoneClasses = computed(() => [
  'relative border-2 border-dashed rounded-[2rem] transition-all duration-300',
  'min-h-[120px] flex flex-col items-center justify-center p-6',
  isDragging.value 
    ? 'border-primary bg-primary/10 scale-[1.02]' 
    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100',
  props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
  !canAddMore.value ? 'pointer-events-none' : '',
]);
</script>

<template>
  <div class="space-y-4">
    <!-- Input oculto -->
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/jpeg,image/jpg,image/png,image/webp"
      class="hidden"
      :disabled="disabled || !canAddMore"
      @change="handleFileSelect"
    />

    <!-- Grid de imágenes existentes -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      <!-- Imágenes actuales -->
      <div
        v-for="(image, index) in previewImages"
        :key="index"
        class="relative group aspect-square rounded-[2rem] overflow-hidden bg-gray-100"
      >
        <img
          :src="image"
          :alt="'Imagen ' + (index + 1)"
          class="w-full h-full object-cover"
        />
        
        <!-- Botón de eliminar -->
        <button
          v-if="!disabled"
          type="button"
          class="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-red-600"
          @click="removeImage(index)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <!-- Indicador de número -->
        <div class="absolute bottom-2 left-2 w-6 h-6 bg-black/50 text-white text-xs rounded-full flex items-center justify-center">
          {{ index + 1 }}
        </div>
      </div>

      <!-- Slot para agregar más imágenes -->
      <div
        v-if="canAddMore"
        :class="dropZoneClasses"
        @click="triggerFileSelect"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
      >
        <!-- Estado de carga -->
        <div v-if="isUploading" class="text-center">
          <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p class="text-sm text-gray-600">Subiendo... {{ uploadProgress }}%</p>
        </div>
        
        <!-- Estado normal -->
        <div v-else class="text-center">
          <svg class="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p class="text-sm text-gray-600 font-medium">
            Agregar imagen{{ remainingSlots > 1 ? `s` : '' }}
          </p>
          <p class="text-xs text-gray-400 mt-1">
            {{ remainingSlots }}/{{ maxImages }} disponibles
          </p>
        </div>
      </div>
    </div>

    <!-- Información adicional -->
    <div class="text-xs text-gray-500 space-y-1">
      <p>• Formatos: JPG, PNG, WebP (máx. 5MB cada uno)</p>
      <p>• Las imágenes se comprimirán automáticamente para optimizar la carga</p>
      <p>• Arrastra y suelta imágenes o haz clic para seleccionar</p>
    </div>
  </div>
</template>

<style scoped>
/* Animaciones personalizadas */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>