<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import ImageUpload from './ImageUpload.vue';
import { useAuth } from '../../application/stores/authStore';
import { CreateProductUseCase } from '../../application/use-cases/CreateProductUseCase';
import { FirestoreProductRepository } from '../../infrastructure/repositories/FirestoreProductRepository';
import { ImageCompressionService } from '../../infrastructure/services/ImageCompressionService';

// Tipo para la condición en el formulario (UI)
type FormCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

interface Emits {
  (e: 'success', productId: string): void;
  (e: 'error', error: string): void;
}

const emit = defineEmits<Emits>();
const { user, initAuth, loading: authLoading } = useAuth();

// Estado del formulario
const currentStep = ref(1);
const isSubmitting = ref(false);
const formError = ref('');
const draftSaved = ref(false);

// Datos del producto
const productData = ref({
  title: '',
  description: '',
  price: '',
  originalPrice: '',
  category: '',
  subcategory: '',
  brand: '',
  size: '',
  condition: '' as FormCondition,
  images: [] as string[],
});

// Archivos originales de las imágenes (necesarios para el CreateProductUseCase)
const imageFiles = ref<File[]>([]);

// Opciones para los campos (valores UI que se mapean al backend)
const conditionOptions: { value: FormCondition; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'like_new', label: 'Como nuevo' },
  { value: 'good', label: 'Bueno' },
  { value: 'fair', label: 'Regular' },
  { value: 'poor', label: 'Malo' },
];

const categories = ref([
  { id: 'ropa', name: 'Ropa', subcategories: ['Camisetas', 'Pantalones', 'Vestidos', 'Chaquetas'] },
  { id: 'calzado', name: 'Calzado', subcategories: ['Zapatillas', 'Botas', 'Sandalias', 'Tacones'] },
  { id: 'accesorios', name: 'Accesorios', subcategories: ['Bolsos', 'Relojes', 'Gafas', 'Joyería'] },
  { id: 'electronica', name: 'Electrónica', subcategories: ['Móviles', 'Portátiles', 'Tablets', 'Consolas'] },
  { id: 'hogar', name: 'Hogar', subcategories: ['Muebles', 'Decoración', 'Cocina', 'Jardín'] },
]);

const sizeOptions = ref<string[]>([]);

// Computed
const selectedCategory = computed(() => 
  categories.value.find(cat => cat.id === productData.value.category)
);

const totalSteps = 5;

const canGoNext = computed(() => {
  switch (currentStep.value) {
    case 1:
      return productData.value.title.trim().length >= 3 && 
             productData.value.description.trim().length >= 10;
    case 2:
      return productData.value.category !== '';
    case 3:
      const price = parseFloat(productData.value.price);
      const originalPrice = productData.value.originalPrice ? parseFloat(productData.value.originalPrice) : null;
      
      return productData.value.price !== '' && 
             !isNaN(price) && 
             price > 0 &&
             (!originalPrice || originalPrice >= price);
    case 4:
      return !!productData.value.condition && 
             productData.value.condition.length > 0 &&
             productData.value.images.length > 0;
    case 5:
      return true; // Vista previa, siempre puede continuar
    default:
      return false;
  }
});

const stepTitle = computed(() => {
    const titles = [
      'Información Básica',
      'Categorización',
      'Precios',
      'Características',
      'Vista Previa'
    ];
    return titles[currentStep.value - 1];
  });

  const discountPercentage = computed(() => {
    if (!productData.value.originalPrice || !productData.value.price) return 0;
    const original = parseFloat(productData.value.originalPrice);
    const current = parseFloat(productData.value.price);
    if (original <= current) return 0;
    return Math.round((1 - current / original) * 100);
  });

  // Debug para paso 3
  const step3Debug = computed(() => {
    if (currentStep.value !== 3) return null;
    
    const price = parseFloat(productData.value.price);
    const originalPrice = productData.value.originalPrice ? parseFloat(productData.value.originalPrice) : null;
    
    return {
      priceValue: productData.value.price,
      priceParsed: price,
      priceValid: productData.value.price !== '' && !isNaN(price) && price > 0,
      originalPriceValue: productData.value.originalPrice,
      originalPriceParsed: originalPrice,
      originalPriceValid: !originalPrice || originalPrice >= price,
      canGoNext: productData.value.price !== '' && !isNaN(price) && price > 0 && (!originalPrice || originalPrice >= price)
    };
  });

// Métodos
const nextStep = () => {
  if (canGoNext.value && currentStep.value < totalSteps) {
    currentStep.value++;
    saveDraft();
    formError.value = '';
  } else {
    formError.value = 'Por favor completa todos los campos requeridos';
  }
};

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
    formError.value = '';
  }
};

const goToStep = (step: number) => {
  if (step >= 1 && step <= totalSteps && step <= currentStep.value) {
    currentStep.value = step;
  }
};

const updateSizeOptions = () => {
  const category = selectedCategory.value;
  if (category) {
    switch (category.id) {
      case 'ropa':
        sizeOptions.value = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
        break;
      case 'calzado':
        sizeOptions.value = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
        break;
      default:
        sizeOptions.value = [];
    }
  } else {
    sizeOptions.value = [];
  }
};

const submitProduct = async () => {
  // Verificar que la autenticación haya terminado de cargar
  if (authLoading.value) {
    formError.value = 'Esperando autenticación, por favor espera un momento...';
    return;
  }

  if (!user.value) {
    formError.value = 'Debes estar autenticado para vender un producto. Por favor inicia sesión.';
    emit('error', 'Debes estar autenticado para vender un producto');
    return;
  }

  // Validar que tengamos archivos de imagen
  if (imageFiles.value.length === 0) {
    // Si hay imágenes en preview pero no en files, es porque se recargó la página
    if (productData.value.images.length > 0) {
      formError.value = 'Las imágenes se perdieron al recargar. Por favor, vuelve a agregar las imágenes en el paso 4.';
    } else {
      formError.value = 'Debes agregar al menos una imagen';
    }
    return;
  }

  isSubmitting.value = true;
  formError.value = '';

  try {
    // Crear instancia del caso de uso con sus dependencias
    const productRepository = new FirestoreProductRepository();
    const createProductUseCase = new CreateProductUseCase(
      productRepository,
      ImageCompressionService
    );

    // Preparar request para el caso de uso
    const request = {
      // Información básica
      title: productData.value.title.trim(),
      description: productData.value.description.trim(),
      price: parseFloat(productData.value.price),
      originalPrice: productData.value.originalPrice ? parseFloat(productData.value.originalPrice) : undefined,
      
      // Categorización
      category: productData.value.category,
      subcategory: productData.value.subcategory || undefined,
      
      // Características
      condition: productData.value.condition,
      brand: productData.value.brand.trim() || undefined,
      size: productData.value.size || undefined,
      
      // Imágenes
      images: imageFiles.value,
      
      // Información del vendedor
      sellerId: user.value.uid,
      sellerName: user.value.displayName || user.value.email?.split('@')[0] || 'Usuario',
      sellerEmail: user.value.email || '',
    };

    // Ejecutar el caso de uso
    const response = await createProductUseCase.execute(request);
    
    if (!response.success) {
      throw new Error(response.message);
    }
    
    // Limpiar draft
    clearDraft();
    
    // Emitir éxito
    emit('success', response.product.id);
    
    // Redirigir a mis productos
    window.location.href = '/my-products';
    
  } catch (error) {
    console.error('Error al crear producto:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al crear el producto. Por favor intenta nuevamente.';
    formError.value = errorMessage;
    emit('error', errorMessage);
  } finally {
    isSubmitting.value = false;
  }
};

// Autoguardado
const saveDraft = () => {
  const draft = {
    ...productData.value,
    currentStep: currentStep.value,
  };
  localStorage.setItem('sellFormDraft', JSON.stringify(draft));
  draftSaved.value = true;
  setTimeout(() => {
    draftSaved.value = false;
  }, 2000);
};

const loadDraft = () => {
  const draft = localStorage.getItem('sellFormDraft');
  if (draft) {
    try {
      const parsedDraft = JSON.parse(draft);
      
      // Cargar datos del draft EXCEPTO las imágenes
      // Las imágenes (objetos File) no se pueden serializar, así que las limpiamos
      const hadImages = parsedDraft.images && parsedDraft.images.length > 0;
      
      productData.value = { 
        ...parsedDraft,
        images: [], // Limpiar imágenes ya que los Files no se pueden recuperar
      };
      
      // Si el usuario estaba en el paso 5 pero tenía imágenes, regresarlo al paso 4
      // para que vuelva a subirlas
      if (hadImages && parsedDraft.currentStep >= 4) {
        currentStep.value = 4;
        formError.value = 'Las imágenes no se pueden recuperar después de recargar. Por favor, vuelve a agregarlas.';
      } else {
        currentStep.value = parsedDraft.currentStep || 1;
      }
      
      updateSizeOptions();
    } catch (error) {
      console.error('Error al cargar borrador:', error);
    }
  }
};

const clearDraft = () => {
  localStorage.removeItem('sellFormDraft');
};

// Lifecycle
onMounted(() => {
  // Inicializar autenticación para que user.value esté disponible
  initAuth();
  loadDraft();
});

onUnmounted(() => {
  if (currentStep.value < totalSteps) {
    saveDraft();
  }
});

// Watch para actualizar opciones de talla
const updateSizeOptionsWatch = () => {
  updateSizeOptions();
};
</script>

<template>
  <div class="max-w-4xl mx-auto bg-white rounded-[3rem] shadow-lg p-4 sm:p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-black text-gray-900 mb-2">Vende tu tesoro</h1>
      <p class="text-gray-600">Completa el formulario para publicar tu producto</p>
    </div>

    <!-- Indicador de progreso -->
    <div class="mb-8">
      <!-- Mobile: Compacto -->
      <div class="sm:hidden mb-4">
        <div class="flex items-center justify-between">
          <div 
            v-for="step in totalSteps" 
            :key="step"
            class="flex-1 relative"
          >
            <!-- Número de paso -->
            <button
              type="button"
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 mx-auto"
              :class="{
                'bg-primary text-white': step <= currentStep,
                'bg-gray-200 text-gray-500': step > currentStep,
                'cursor-pointer': step <= currentStep,
                'cursor-default': step > currentStep
              }"
              @click="goToStep(step)"
            >
              {{ step }}
            </button>
            <!-- Línea conector (solo entre pasos) -->
            <div 
              v-if="step < totalSteps"
              class="absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2 z-0"
              :class="{
                'bg-primary': step < currentStep,
                'bg-gray-200': step >= currentStep
              }"
            />
          </div>
        </div>
      </div>

      <!-- Desktop: Versión extendida -->
      <div class="hidden sm:flex items-center justify-between mb-4">
        <div 
          v-for="step in totalSteps" 
          :key="step"
          class="flex items-center"
        >
          <button
            type="button"
            class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200"
            :class="{
              'bg-primary text-white': step <= currentStep,
              'bg-gray-200 text-gray-500': step > currentStep,
              'cursor-pointer': step <= currentStep,
              'cursor-default': step > currentStep
            }"
            @click="goToStep(step)"
          >
            {{ step }}
          </button>
          <div 
            v-if="step < totalSteps"
            class="w-12 h-1 mx-2"
            :class="{
              'bg-primary': step < currentStep,
              'bg-gray-200': step >= currentStep
            }"
          />
        </div>
      </div>

      <!-- Título del paso (responsivo) -->
      <div class="text-center">
        <h2 class="text-xl font-bold text-gray-900">{{ stepTitle }}</h2>
        <p class="text-sm text-gray-500">Paso {{ currentStep }} de {{ totalSteps }}</p>
      </div>
    </div>

    <!-- Mensaje de error -->
    <div v-if="formError" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
      <p class="text-red-600 text-sm">{{ formError }}</p>
    </div>

    <!-- Indicador de autoguardado -->
    <div v-if="draftSaved" class="mb-6 p-3 bg-green-50 border border-green-200 rounded-xl">
      <p class="text-green-600 text-sm flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Borrador guardado automaticamente
      </p>
    </div>

    <!-- Formulario multi-step -->
    <form @submit.prevent="submitProduct">
      <!-- Step 1: Información Básica -->
      <div v-if="currentStep === 1" class="space-y-6">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Título del producto *
          </label>
          <input
            v-model="productData.title"
            type="text"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Ej: Zapatillas Nike Air Max casi nuevas"
            maxlength="100"
            required
          />
          <p class="text-xs text-gray-500 mt-1">
            {{ productData.title.length }}/100 caracteres
          </p>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Descripción *
          </label>
          <textarea
            v-model="productData.description"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            rows="4"
            placeholder="Describe tu producto con detalle: estado, características, motivo de venta..."
            maxlength="1000"
            required
          />
          <p class="text-xs text-gray-500 mt-1">
            {{ productData.description.length }}/1000 caracteres
          </p>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Marca
          </label>
          <input
            v-model="productData.brand"
            type="text"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Ej: Nike, Adidas, Zara..."
            maxlength="50"
          />
        </div>
      </div>

      <!-- Step 2: Categorización -->
      <div v-if="currentStep === 2" class="space-y-6">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Categoría *
          </label>
          <select
            v-model="productData.category"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            required
            @change="updateSizeOptionsWatch"
          >
            <option value="">Selecciona una categoría</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </div>

        <div v-if="selectedCategory">
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Subcategoría
          </label>
          <select
            v-model="productData.subcategory"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Selecciona una subcategoría (opcional)</option>
            <option v-for="subcategory in selectedCategory.subcategories" :key="subcategory" :value="subcategory">
              {{ subcategory }}
            </option>
          </select>
        </div>

        <div v-if="sizeOptions.length > 0">
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Talla
          </label>
          <select
            v-model="productData.size"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Selecciona una talla (opcional)</option>
            <option v-for="size in sizeOptions" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </div>
      </div>

      <!-- Step 3: Precios -->
      <div v-if="currentStep === 3" class="space-y-6">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Precio actual *
          </label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">
              $
            </span>
            <input
              v-model="productData.price"
              type="number"
              step="0.01"
              min="1"
              max="99999"
              class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Precio original
          </label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">
              $
            </span>
            <input
              v-model="productData.originalPrice"
              type="number"
              step="0.01"
              min="1"
              max="99999"
              class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0.00"
            />
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Opcional. Útil para mostrar descuentos
          </p>
        </div>

<!-- Vista previa de precios -->
        <div v-if="productData.price" class="p-4 bg-gray-50 rounded-xl">
          <p class="text-sm text-gray-600 mb-2">Vista previa de precios:</p>
          <div class="flex items-center gap-3">
            <span v-if="productData.originalPrice && parseFloat(productData.originalPrice) > parseFloat(productData.price)" 
                  class="text-lg text-gray-400 line-through">
              ${{ parseFloat(productData.originalPrice).toFixed(2) }}
            </span>
            <span class="text-2xl font-black text-primary">
              ${{ parseFloat(productData.price).toFixed(2) }}
            </span>
            <span v-if="discountPercentage > 0" 
                  class="text-sm text-green-600 font-bold">
              -{{ discountPercentage }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Step 4: Características -->
      <div v-if="currentStep === 4" class="space-y-6">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Condición del producto *
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label v-for="option in conditionOptions" :key="option.value" 
                   class="relative cursor-pointer">
              <input
                v-model="productData.condition"
                type="radio"
                :value="option.value"
                class="sr-only peer"
                required
              />
              <div class="p-3 sm:p-4 border-2 rounded-xl text-center transition-all duration-200 peer-checked:border-primary peer-checked:bg-primary/10">
                <p class="font-bold text-gray-900 text-sm sm:text-base">{{ option.label }}</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Imágenes del producto *
          </label>
          <ImageUpload
            v-model="productData.images"
            :max-images="8"
            @error="formError = $event"
            @files-updated="imageFiles = $event"
          />
        </div>
      </div>

      <!-- Step 5: Vista Previa -->
      <div v-if="currentStep === 5" class="space-y-6">
        <div class="bg-gray-50 rounded-xl p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-4">Vista previa del producto</h3>
          
          <!-- Galería de imágenes -->
          <div v-if="productData.images.length > 0" class="mb-6">
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div v-for="(image, index) in productData.images" :key="index" 
                   class="aspect-square rounded-xl overflow-hidden bg-gray-200">
                <img :src="image" :alt="`Imagen ${index + 1}`" class="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          <!-- Detalles del producto -->
          <div class="space-y-3">
            <div>
              <h4 class="text-xl font-black text-gray-900">{{ productData.title || 'Sin título' }}</h4>
              <p class="text-sm text-gray-500">{{ selectedCategory?.name || 'Sin categoría' }}</p>
            </div>

            <div class="flex items-center gap-3">
              <span v-if="productData.originalPrice && parseFloat(productData.originalPrice) > parseFloat(productData.price)" 
                    class="text-lg text-gray-400 line-through">
                ${{ parseFloat(productData.originalPrice).toFixed(2) }}
              </span>
              <span class="text-2xl font-black text-primary">
                ${{ parseFloat(productData.price || '0').toFixed(2) }}
              </span>
<span v-if="discountPercentage > 0" 
                    class="text-sm text-green-600 font-bold">
                -{{ discountPercentage }}%
              </span>
            </div>

            <p class="text-gray-700">{{ productData.description || 'Sin descripción' }}</p>

            <div class="flex flex-wrap gap-2 text-sm">
              <span v-if="productData.brand" class="px-3 py-1 bg-gray-200 rounded-full">
                Marca: {{ productData.brand }}
              </span>
              <span v-if="productData.size" class="px-3 py-1 bg-gray-200 rounded-full">
                Talla: {{ productData.size }}
              </span>
              <span v-if="productData.condition" class="px-3 py-1 bg-gray-200 rounded-full">
                Condición: {{ conditionOptions.find(opt => opt.value === productData.condition)?.label }}
              </span>
            </div>
          </div>
        </div>

        <div class="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p class="text-blue-600 text-sm">
            <strong>Importante:</strong> Al hacer clic en "Enviar a Revisión", tu producto será evaluado por nuestro equipo. 
            Recibirás una notificación cuando sea aprobado o si se necesitan cambios.
          </p>
        </div>
      </div>

<!-- Botones de navegación -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 pt-6 border-t border-gray-200 gap-4">
      <button
        type="button"
        class="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors duration-200 order-2 sm:order-1"
        :disabled="currentStep === 1"
        @click="previousStep"
      >
        Anterior
      </button>

      <div class="w-full sm:w-auto flex gap-3 order-1 sm:order-2">
        <button
          v-if="currentStep < totalSteps"
          type="button"
          class="flex-1 sm:flex-none px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canGoNext"
          @click="nextStep"
        >
          Siguiente
        </button>

        <button
          v-if="currentStep === totalSteps"
          type="submit"
          class="flex-1 sm:flex-none px-6 sm:px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          :disabled="isSubmitting || !canGoNext || authLoading"
        >
          <div v-if="isSubmitting || authLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {{ authLoading ? 'Verificando...' : isSubmitting ? 'Enviando...' : 'Enviar a Revisión' }}
        </button>
      </div>
    </div>
    </form>
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