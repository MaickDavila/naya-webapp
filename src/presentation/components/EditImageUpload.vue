<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { ImageCompressionService } from '../../infrastructure/services/ImageCompressionService';

interface ImageItem {
  url: string;
  isExisting: boolean; // true si es una URL existente, false si es una nueva imagen
  file?: File; // Solo para nuevas imágenes
}

interface Props {
  existingImages: string[]; // URLs de imágenes existentes
  maxImages?: number;
  disabled?: boolean;
}

interface Emits {
  (e: 'update:existingImages', value: string[]): void;
  (e: 'newFilesUpdated', files: File[]): void;
  (e: 'error', error: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  maxImages: 8,
});

const emit = defineEmits<Emits>();

const fileInput = ref<HTMLInputElement>();
const isDragging = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);

// Lista combinada de imágenes (existentes + nuevas)
const allImages = ref<ImageItem[]>([]);
const newFiles = ref<File[]>([]);

// Inicializar con imágenes existentes
onMounted(() => {
  allImages.value = props.existingImages.map(url => ({
    url,
    isExisting: true,
  }));
});

// Sincronizar cuando cambian las imágenes existentes desde el padre
watch(() => props.existingImages, (newVal) => {
  // Solo actualizar si las imágenes existentes cambiaron externamente
  const currentExisting = allImages.value.filter(img => img.isExisting).map(img => img.url);
  if (JSON.stringify(currentExisting) !== JSON.stringify(newVal)) {
    const newImages = allImages.value.filter(img => !img.isExisting);
    allImages.value = [
      ...newVal.map(url => ({ url, isExisting: true })),
      ...newImages
    ];
  }
}, { deep: true });

const canAddMore = computed(() => 
  allImages.value.length < props.maxImages && !props.disabled
);

const remainingSlots = computed(() => 
  props.maxImages - allImages.value.length
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
    // Generar previsualizaciones
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const preview = await ImageCompressionService.generatePreview(file);
      
      allImages.value.push({
        url: preview,
        isExisting: false,
        file: file,
      });
      
      newFiles.value.push(file);
      uploadProgress.value = Math.round(((i + 1) / files.length) * 100);
    }
    
    // Emitir actualizaciones
    emitUpdates();
    
  } catch (error) {
    console.error('Error al procesar imágenes:', error);
    emit('error', 'Error al procesar las imágenes');
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

const removeImage = (index: number) => {
  const imageToRemove = allImages.value[index];
  
  // Si es una imagen nueva, también eliminarla de newFiles
  if (!imageToRemove.isExisting && imageToRemove.file) {
    const fileIndex = newFiles.value.indexOf(imageToRemove.file);
    if (fileIndex > -1) {
      newFiles.value.splice(fileIndex, 1);
    }
  }
  
  allImages.value.splice(index, 1);
  emitUpdates();
};

const emitUpdates = () => {
  // Emitir URLs de imágenes existentes que se mantienen
  const existingUrls = allImages.value
    .filter(img => img.isExisting)
    .map(img => img.url);
  emit('update:existingImages', existingUrls);
  
  // Emitir archivos nuevos
  emit('newFilesUpdated', newFiles.value);
};

const triggerFileSelect = () => {
  if (!props.disabled && fileInput.value) {
    fileInput.value.click();
  }
};

// Clases CSS dinámicas
const dropZoneClasses = computed(() => [
  'relative border-2 border-dashed rounded-2xl transition-all duration-300',
  'min-h-[100px] flex flex-col items-center justify-center p-4',
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

    <!-- Grid de imágenes -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      <!-- Imágenes actuales -->
      <div
        v-for="(image, index) in allImages"
        :key="index"
        class="relative group aspect-square rounded-2xl overflow-hidden bg-gray-100"
      >
        <img
          :src="image.url"
          :alt="'Imagen ' + (index + 1)"
          class="w-full h-full object-cover"
        />
        
        <!-- Badge de imagen existente vs nueva -->
        <div 
          v-if="!image.isExisting"
          class="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full font-medium"
        >
          Nueva
        </div>
        
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
          <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p class="text-xs text-gray-600">{{ uploadProgress }}%</p>
        </div>
        
        <!-- Estado normal -->
        <div v-else class="text-center">
          <svg class="w-10 h-10 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p class="text-xs text-gray-600 font-medium">
            Agregar
          </p>
          <p class="text-xs text-gray-400">
            {{ remainingSlots }} restantes
          </p>
        </div>
      </div>
    </div>

    <!-- Información adicional -->
    <div class="text-xs text-gray-500 space-y-1">
      <p>• La primera foto será la imagen principal</p>
      <p>• Formatos: JPG, PNG, WebP (máx. 5MB)</p>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
