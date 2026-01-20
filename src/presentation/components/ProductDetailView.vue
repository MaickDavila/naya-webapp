<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Product } from '../../domain/entities/Product';
import { CONDITION_LABELS } from '../../domain/entities/Product';
import type { User } from '../../domain/entities/User';
import { useCart } from '../../application/stores/cartStore';
import { formatPrice } from '../utils/formatters';

const props = defineProps<{
  product: Product;
  seller: User | null;
}>();

const { addItem } = useCart();
const activeImage = ref(props.product.images[0] || 'https://via.placeholder.com/600x800?text=NAYA');
const isAdded = ref(false);

const handleAddToCart = () => {
  addItem(props.product);
  isAdded.value = true;
  setTimeout(() => isAdded.value = false, 2000);
};

// Obtener etiqueta de condicion
const conditionLabel = computed(() => {
  if (!props.product.condition) return null;
  return CONDITION_LABELS[props.product.condition] || props.product.condition;
});

// Calcular descuento si hay precio original
const discountPercentage = computed(() => {
  if (!props.product.originalPrice || props.product.originalPrice <= props.product.price) {
    return 0;
  }
  return Math.round((1 - props.product.price / props.product.originalPrice) * 100);
});

// Verificar si tiene detalles adicionales para mostrar
const hasDetails = computed(() => {
  return props.product.condition || props.product.size || props.product.brand || props.product.color;
});

// Obtener nombre del vendedor con fallbacks
const sellerDisplayName = computed(() => {
  // Prioridad: seller del perfil > sellerName del producto > fallback
  return props.seller?.displayName 
    || props.seller?.name 
    || props.product.sellerName 
    || 'Vendedor Naya';
});
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
    <!-- Galería de Imágenes -->
    <div class="flex flex-col gap-4">
      <div class="aspect-[3/4] rounded-[3rem] overflow-hidden bg-gray-100 shadow-xl border border-black/5">
        <img :src="activeImage" :alt="product.title" class="w-full h-full object-cover" />
      </div>
      
      <div v-if="product.images.length > 1" class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          v-for="(img, index) in product.images" 
          :key="index"
          @click="activeImage = img"
          class="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all"
          :class="activeImage === img ? 'border-primary shadow-md' : 'border-transparent opacity-60'"
        >
          <img :src="img" class="w-full h-full object-cover" />
        </button>
      </div>
    </div>

    <!-- Información del Producto -->
    <div class="flex flex-col py-4">
      <div class="mb-8">
        <span class="text-xs font-black uppercase tracking-[0.3em] text-primary-light mb-3 block">
          {{ product.category }}
        </span>
        <h1 class="text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-4">
          {{ product.title }}
        </h1>
        
        <!-- Precios con descuento -->
        <div class="flex items-center gap-4 flex-wrap">
          <div class="flex items-baseline gap-3">
            <span class="text-3xl font-black text-primary">{{ formatPrice(product.price) }}</span>
            <span 
              v-if="product.originalPrice && discountPercentage > 0" 
              class="text-lg text-gray-400 line-through"
            >
              {{ formatPrice(product.originalPrice) }}
            </span>
          </div>
          <span 
            v-if="discountPercentage > 0" 
            class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold"
          >
            -{{ discountPercentage }}%
          </span>
          <span 
            v-if="product.status === 'approved'" 
            class="bg-success/10 text-success px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
          >
            Disponible
          </span>
        </div>
      </div>

      <!-- Detalles del producto -->
      <div v-if="hasDetails" class="mb-8">
        <h3 class="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 border-b border-black/5 pb-2">
          Detalles
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <!-- Condicion -->
          <div v-if="conditionLabel" class="flex flex-col">
            <span class="text-xs text-gray-400 uppercase tracking-wider mb-1">Condicion</span>
            <span class="font-bold text-gray-900">{{ conditionLabel }}</span>
          </div>
          
          <!-- Marca -->
          <div v-if="product.brand" class="flex flex-col">
            <span class="text-xs text-gray-400 uppercase tracking-wider mb-1">Marca</span>
            <span class="font-bold text-gray-900">{{ product.brand }}</span>
          </div>
          
          <!-- Talla -->
          <div v-if="product.size" class="flex flex-col">
            <span class="text-xs text-gray-400 uppercase tracking-wider mb-1">Talla</span>
            <span class="font-bold text-gray-900">{{ product.size }}</span>
          </div>
          
          <!-- Color -->
          <div v-if="product.color" class="flex flex-col">
            <span class="text-xs text-gray-400 uppercase tracking-wider mb-1">Color</span>
            <span class="font-bold text-gray-900">{{ product.color }}</span>
          </div>
        </div>
      </div>

      <!-- Descripcion -->
      <div class="mb-10">
        <h3 class="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 border-b border-black/5 pb-2">
          Descripcion
        </h3>
        <p class="text-gray-600 leading-relaxed text-lg">
          {{ product.description }}
        </p>
      </div>

      <!-- Acciones -->
      <div class="mt-auto flex flex-col gap-4">
        <button 
          @click="handleAddToCart"
          class="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/25 active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <svg v-if="!isAdded" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{{ isAdded ? '¡Añadido!' : 'Añadir a la bolsa' }}</span>
        </button>
        
        <button class="w-full bg-white text-gray-900 py-5 rounded-[2rem] font-bold text-lg border-2 border-black/5 hover:bg-gray-50 transition-all flex items-center justify-center gap-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>Guardar en favoritos</span>
        </button>
      </div>

      <!-- Info del Vendedor -->
      <div class="mt-12 p-6 bg-background-secondary rounded-[2rem] flex items-center gap-4 border border-black/5">
        <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-black text-xl overflow-hidden shadow-md shadow-primary/10">
          <img v-if="seller?.photoURL" :src="seller.photoURL" :alt="sellerDisplayName" class="w-full h-full object-cover" />
          <span v-else>{{ sellerDisplayName.charAt(0).toUpperCase() }}</span>
        </div>
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Vendido por</p>
          <p class="font-black text-gray-900">{{ sellerDisplayName }}</p>
        </div>
        <a :href="`/sellers/${product.sellerId}`" class="ml-auto text-primary font-bold text-sm hover:underline">Ver perfil</a>
      </div>
    </div>
  </div>
</template>
