<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import EditImageUpload from './EditImageUpload.vue';
import { useAuth } from '../../application/stores/authStore';
import { UpdateProductUseCase } from '../../application/use-cases/UpdateProductUseCase';
import { FirestoreProductRepository } from '../../infrastructure/repositories/FirestoreProductRepository';
import { ImageCompressionService } from '../../infrastructure/services/ImageCompressionService';
import type { Product, ProductCondition } from '../../domain/entities/Product';

// Tipo para la condición en el formulario (UI)
type FormCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

// Mapeo inverso de condiciones (Backend -> UI)
const CONDITION_REVERSE_MAP: Record<ProductCondition, FormCondition> = {
  'nuevo': 'new',
  'como_nuevo': 'like_new',
  'buen_estado': 'good',
  'regular': 'fair',
  'necesita_reparacion': 'poor',
};

interface Props {
  productId: string;
}

interface Emits {
  (e: 'success', productId: string): void;
  (e: 'error', error: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { user, initAuth, loading: authLoading } = useAuth();

// Estado del formulario
const isLoading = ref(true);
const isSubmitting = ref(false);
const formError = ref('');
const acceptTerms = ref(true); // Por defecto true ya que ya aceptó antes
const originalProduct = ref<Product | null>(null);

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
  existingImages: [] as string[],
});

// Archivos nuevos de las imágenes
const newImageFiles = ref<File[]>([]);

// Opciones para los campos
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

const totalImages = computed(() => 
  productData.value.existingImages.length + newImageFiles.value.length
);

const canSubmit = computed(() => {
  const price = parseFloat(productData.value.price);
  const originalPrice = productData.value.originalPrice ? parseFloat(productData.value.originalPrice) : null;
  
  return totalImages.value > 0 &&
         productData.value.title.trim().length >= 3 &&
         productData.value.category !== '' &&
         productData.value.condition !== '' &&
         productData.value.description.trim().length >= 10 &&
         productData.value.price !== '' &&
         !isNaN(price) &&
         price > 0 &&
         (!originalPrice || originalPrice >= price) &&
         acceptTerms.value;
});

const discountPercentage = computed(() => {
  if (!productData.value.originalPrice || !productData.value.price) return 0;
  const original = parseFloat(productData.value.originalPrice);
  const current = parseFloat(productData.value.price);
  if (original <= current) return 0;
  return Math.round((1 - current / original) * 100);
});

const isRejected = computed(() => originalProduct.value?.status === 'rejected');

// Métodos
const loadProduct = async () => {
  isLoading.value = true;
  formError.value = '';
  
  try {
    const productRepository = new FirestoreProductRepository();
    const product = await productRepository.getById(props.productId);
    
    if (!product) {
      formError.value = 'Producto no encontrado';
      return;
    }
    
    // Verificar que el usuario es el dueño
    if (user.value && product.sellerId !== user.value.uid) {
      formError.value = 'No tienes permiso para editar este producto';
      return;
    }
    
    originalProduct.value = product;
    
    // Mapear datos al formulario
    productData.value = {
      title: product.title,
      description: product.description,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || '',
      category: product.category,
      subcategory: product.subcategory || '',
      brand: product.brand || '',
      size: product.size || '',
      condition: CONDITION_REVERSE_MAP[product.condition] || 'good',
      existingImages: [...product.images],
    };
    
    // Actualizar opciones de talla
    updateSizeOptions();
    
  } catch (error) {
    console.error('Error al cargar producto:', error);
    formError.value = 'Error al cargar el producto';
  } finally {
    isLoading.value = false;
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

const handleCancel = () => {
  window.location.href = '/my-products';
};

const submitProduct = async () => {
  if (authLoading.value) {
    formError.value = 'Esperando autenticación, por favor espera un momento...';
    return;
  }

  if (!user.value) {
    formError.value = 'Debes estar autenticado para editar un producto.';
    emit('error', 'Debes estar autenticado');
    return;
  }

  if (totalImages.value === 0) {
    formError.value = 'Debes tener al menos una imagen';
    return;
  }

  if (!acceptTerms.value) {
    formError.value = 'Debes aceptar los términos para actualizar tu producto';
    return;
  }

  isSubmitting.value = true;
  formError.value = '';

  try {
    const productRepository = new FirestoreProductRepository();
    const updateProductUseCase = new UpdateProductUseCase(
      productRepository,
      ImageCompressionService
    );

    const request = {
      productId: props.productId,
      title: productData.value.title.trim(),
      description: productData.value.description.trim(),
      price: parseFloat(productData.value.price),
      originalPrice: productData.value.originalPrice ? parseFloat(productData.value.originalPrice) : undefined,
      category: productData.value.category,
      subcategory: productData.value.subcategory || undefined,
      condition: productData.value.condition,
      brand: productData.value.brand.trim() || undefined,
      size: productData.value.size || undefined,
      existingImages: productData.value.existingImages,
      newImages: newImageFiles.value,
      sellerId: user.value.uid,
    };

    const response = await updateProductUseCase.execute(request);
    
    if (!response.success) {
      throw new Error(response.message);
    }
    
    emit('success', response.product.id);
    window.location.href = '/my-products';
    
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el producto.';
    formError.value = errorMessage;
    emit('error', errorMessage);
  } finally {
    isSubmitting.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  initAuth();
});

// Esperar a que el usuario esté autenticado para cargar el producto
watch(() => user.value, (newUser) => {
  if (newUser && !originalProduct.value) {
    loadProduct();
  }
}, { immediate: true });

// Watch para actualizar opciones de talla cuando cambia la categoría
watch(() => productData.value.category, () => {
  updateSizeOptions();
});
</script>

<template>
  <div class="max-w-2xl mx-auto bg-white rounded-[2rem] shadow-lg p-4 sm:p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Editar producto</h1>
      <p class="text-gray-600 text-sm sm:text-base">Modifica la información de tu producto</p>
    </div>

    <!-- Estado de carga -->
    <div v-if="isLoading || authLoading" class="flex flex-col items-center justify-center py-20">
      <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
      <p class="text-gray-500">Cargando producto...</p>
    </div>

    <!-- Contenido del formulario -->
    <template v-else>
      <!-- Aviso de producto rechazado -->
      <div v-if="isRejected && originalProduct?.moderationNotes" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p class="text-red-800 font-bold text-sm mb-1">Producto rechazado</p>
            <p class="text-red-700 text-sm">{{ originalProduct.moderationNotes }}</p>
            <p class="text-red-600 text-xs mt-2">Corrige los problemas indicados y guarda para reenviar a revisión.</p>
          </div>
        </div>
      </div>

      <!-- Mensaje de error -->
      <div v-if="formError" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
        <p class="text-red-600 text-sm">{{ formError }}</p>
      </div>

      <!-- Formulario -->
      <form @submit.prevent="submitProduct" class="space-y-6">
        
        <!-- 1. Fotos -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Fotos del producto *
          </label>
          <EditImageUpload
            :existing-images="productData.existingImages"
            :max-images="8"
            @update:existing-images="productData.existingImages = $event"
            @new-files-updated="newImageFiles = $event"
            @error="formError = $event"
          />
          <p class="text-xs text-gray-500 mt-2">
            La primera foto será la imagen principal de tu producto
          </p>
        </div>

        <!-- 2. Nombre -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Nombre del producto *
          </label>
          <input
            v-model="productData.title"
            type="text"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="Ej: Zapatillas Nike Air Max casi nuevas"
            maxlength="100"
            required
          />
          <p class="text-xs text-gray-500 mt-1">
            {{ productData.title.length }}/100 caracteres
          </p>
        </div>

        <!-- 3. Categoría -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Categoría *
          </label>
          <select
            v-model="productData.category"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
            required
          >
            <option value="">Selecciona una categoría</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </div>

        <!-- 4. Subcategoría -->
        <div v-if="selectedCategory">
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Subcategoría
          </label>
          <select
            v-model="productData.subcategory"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
          >
            <option value="">Selecciona una subcategoría (opcional)</option>
            <option v-for="subcategory in selectedCategory.subcategories" :key="subcategory" :value="subcategory">
              {{ subcategory }}
            </option>
          </select>
        </div>

        <!-- 5. Talla -->
        <div v-if="sizeOptions.length > 0">
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Talla
          </label>
          <select
            v-model="productData.size"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
          >
            <option value="">Selecciona una talla (opcional)</option>
            <option v-for="size in sizeOptions" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </div>

        <!-- 6. Condición -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Condición del producto *
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <label v-for="option in conditionOptions" :key="option.value" 
                   class="relative cursor-pointer">
              <input
                v-model="productData.condition"
                type="radio"
                :value="option.value"
                class="sr-only peer"
                required
              />
              <div class="p-3 border-2 rounded-xl text-center transition-all duration-200 peer-checked:border-primary peer-checked:bg-primary/10 hover:border-gray-400">
                <p class="font-bold text-gray-900 text-sm">{{ option.label }}</p>
              </div>
            </label>
          </div>
        </div>

        <!-- 7. Descripción -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Descripción *
          </label>
          <textarea
            v-model="productData.description"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            rows="4"
            placeholder="Describe tu producto con detalle: estado, características, motivo de venta..."
            maxlength="1000"
            required
          />
          <p class="text-xs text-gray-500 mt-1">
            {{ productData.description.length }}/1000 caracteres (mínimo 10)
          </p>
        </div>

        <!-- 8. Marca -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Marca
          </label>
          <input
            v-model="productData.brand"
            type="text"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="Ej: Nike, Adidas, Zara..."
            maxlength="50"
          />
        </div>

        <!-- 9. Precio -->
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Precio *
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
              class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <!-- 10. Precio original -->
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
              class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="0.00"
            />
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Opcional. Útil para mostrar descuentos
          </p>
          
          <!-- Vista previa de descuento -->
          <div v-if="discountPercentage > 0" class="mt-2 p-3 bg-green-50 rounded-xl">
            <p class="text-green-600 text-sm font-medium flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Tu producto mostrará un descuento del {{ discountPercentage }}%
            </p>
          </div>
        </div>

        <!-- 11. Checkbox de aceptación -->
        <div class="pt-4 border-t border-gray-200">
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              v-model="acceptTerms"
              type="checkbox"
              class="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2 cursor-pointer"
            />
            <span class="text-sm text-gray-600 leading-relaxed">
              Al publicar, aceptas que <strong class="text-gray-900">Naya</strong> pueda remover el fondo de la foto principal de tu producto con el fin de asegurar mayor visibilidad y mejores resultados de venta.
            </span>
          </label>
        </div>

        <!-- 12. Botones (uno sobre otro) -->
        <div class="pt-6 space-y-3">
          <button
            type="submit"
            class="w-full px-6 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="!canSubmit || isSubmitting || authLoading"
          >
            <div v-if="isSubmitting || authLoading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ authLoading ? 'Verificando...' : isSubmitting ? 'Guardando...' : isRejected ? 'Guardar y reenviar a revisión' : 'Guardar cambios' }}
          </button>
          
          <button
            type="button"
            class="w-full px-6 py-4 border-2 border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            @click="handleCancel"
          >
            Cancelar
          </button>
        </div>
      </form>
    </template>
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
