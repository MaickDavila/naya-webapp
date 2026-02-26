<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { Product } from '../../domain/entities/Product';
import { CONDITION_LABELS } from '../../domain/entities/Product';
import { useCart } from '../../application/stores/cartStore';
import { useAuth } from '../../application/stores/authStore';
import { useFavorites } from '../../application/stores/favoritesStore';
import { useToast } from '../../application/stores/toastStore';
import { productCartPresenceService } from '../../infrastructure/services/ProductCartPresenceService';
import { productViewersService } from '../../infrastructure/services/ProductViewersService';
import { useProductAvailability } from '../../application/composables/useProductAvailability';
import { formatPrice } from '../utils/formatters';

const props = defineProps<{
  product: Product;
}>();

const { addItem, items, loadCart } = useCart();
const { user, initAuth } = useAuth();
const { isFavorite, toggleFavorite, loadFavorites } = useFavorites();
const { success } = useToast();

const productIds = computed(() => [props.product.id]);
const userId = computed(() => user.value?.uid ?? '');
const { inCheckoutByOthers, inCartByOthers, unsubscribe } = useProductAvailability(
  productIds,
  userId
);

const inCheckoutByOthersProduct = computed(() => inCheckoutByOthers.value.has(props.product.id));
const inCartByOthersProduct = computed(() => inCartByOthers.value.has(props.product.id));
const isBlocked = computed(() => inCheckoutByOthersProduct.value);

/** El producto ya está en la bolsa del usuario actual */
const isInMyCart = computed(() => items.value.some((i) => i.id === props.product.id));

const viewerCount = ref(0);
let unsubscribeViewers: (() => void) | null = null;
let currentViewerId: string | undefined;

const activeImage = ref(props.product.images[0] || 'https://via.placeholder.com/600x800?text=NAYA');
const isAdded = ref(false);
const isFavoriteLoading = ref(false);
const favoriteJustToggled = ref(false);

const isProductFavorite = computed(() => isFavorite(props.product.id));

const handleAddToCart = () => {
  if (isBlocked.value) return;
  addItem(props.product);
  if (user.value) {
    productCartPresenceService.addPresence(props.product.id, user.value.uid);
  }
  isAdded.value = true;
  setTimeout(() => (isAdded.value = false), 2000);
};

const handleToggleFavorite = async () => {
  if (!user.value) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    return;
  }

  const wasAlreadyFavorite = isFavorite(props.product.id);

  isFavoriteLoading.value = true;
  await toggleFavorite(user.value.uid, props.product.id);
  isFavoriteLoading.value = false;

  // Show toast
  if (wasAlreadyFavorite) {
    success("Eliminado de favoritos");
  } else {
    success("Guardado en favoritos");
  }

  // Trigger animation
  favoriteJustToggled.value = true;
  setTimeout(() => {
    favoriteJustToggled.value = false;
  }, 600);
};

onMounted(async () => {
  await initAuth();
  await loadCart(user.value?.uid ?? undefined);
  if (user.value) {
    await loadFavorites(user.value.uid);
  }

  currentViewerId = user.value?.uid;
  await productViewersService.addViewer(props.product.id, currentViewerId);
  unsubscribeViewers = productViewersService.subscribeToViewerCount(
    props.product.id,
    (count) => { viewerCount.value = count; }
  );

  const handlePageLeave = () => {
    productViewersService.removeViewer(props.product.id, currentViewerId);
  };
  window.addEventListener("beforeunload", handlePageLeave);
  window.addEventListener("pagehide", handlePageLeave);
});

onUnmounted(() => {
  productViewersService.removeViewer(props.product.id, currentViewerId);
  unsubscribeViewers?.();
  unsubscribe();
});

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

const activeImageIndex = computed(() => {
  return props.product.images.indexOf(activeImage.value);
});
</script>

<template>
  <div class="flex flex-col">
    <!-- Imagen del producto centrada -->
    <div class="flex justify-center mb-2">
      <div class="w-2/3 aspect-[4/5] overflow-hidden bg-gray-100">
        <img :src="activeImage" :alt="product.title" class="w-full h-full object-cover" />
      </div>
    </div>

    <!-- Dots de paginación -->
    <div v-if="product.images.length > 1" class="flex justify-center gap-2 mb-4">
      <button
        v-for="(img, index) in product.images"
        :key="index"
        @click="activeImage = img"
        class="w-1.5 h-1.5 rounded-full transition-all"
        :class="activeImageIndex === index ? 'bg-black' : 'bg-black/30'"
      />
    </div>

    <!-- Nombre del producto + corazón -->
    <div class="flex flex-col items-center gap-2 mb-6">
      <div class="flex items-center justify-center gap-2">
        <h1 class="text-[15px] text-black font-serif">{{ product.title }}</h1>
        <button @click="handleToggleFavorite" :disabled="isFavoriteLoading" class="flex-shrink-0">
        <svg
          v-if="isFavoriteLoading"
          class="w-4 h-4 animate-spin text-black/50"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg
          v-else
          class="w-4 h-4 transition-transform duration-300"
          :class="favoriteJustToggled ? 'animate-heart-pop' : ''"
          :fill="isProductFavorite ? 'currentColor' : 'none'"
          :stroke="isProductFavorite ? 'none' : 'currentColor'"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        </button>
      </div>
      <p v-if="viewerCount > 0" class="text-xs text-black/50">
        {{ viewerCount }} {{ viewerCount === 1 ? 'persona viendo' : 'personas viendo' }} ahora
      </p>
    </div>

    <!-- Sección DETALLE -->
    <div class="px-2">
      <p class="text-[15px] text-black/50 mb-1">DETALLE</p>
      <p v-if="product.category" class="text-xs text-black/50 mb-1">{{ product.category }}</p>

      <div class="flex flex-col gap-1 mb-4">
        <div class="flex gap-2">
          <span class="text-xs text-black/50">Precio:</span>
          <span class="text-xs text-black">{{ formatPrice(product.price) }}</span>
          <span v-if="product.originalPrice && discountPercentage > 0" class="text-xs text-black/40 line-through">{{ formatPrice(product.originalPrice) }}</span>
        </div>
        <div v-if="product.size" class="flex gap-2">
          <span class="text-xs text-black/50">Talla:</span>
          <span class="text-xs text-black">{{ product.size }}</span>
        </div>
        <div v-if="product.brand" class="flex gap-2">
          <span class="text-xs text-black/50">Marca:</span>
          <span class="text-xs text-black">{{ product.brand }}</span>
        </div>
        <div v-if="product.color" class="flex gap-2">
          <span class="text-xs text-black/50">Color:</span>
          <span class="text-xs text-black">{{ product.color }}</span>
        </div>
      </div>

      <!-- Separador -->
      <div class="border-t border-black/20 my-4"></div>

      <!-- Sección CONDICION -->
      <p class="text-[15px] text-black/50 mb-1">CONDICION</p>
      <div class="flex flex-col gap-1 mb-4">
        <div v-if="conditionLabel" class="flex gap-2">
          <span class="text-xs text-black/50">Estado:</span>
          <span class="text-xs text-black">{{ conditionLabel }}</span>
        </div>
        <div v-if="product.description">
          <span class="text-xs text-black/50">Descripcion:</span>
          <p class="text-xs text-black mt-1 leading-relaxed">{{ product.description }}</p>
        </div>
      </div>

      <!-- Separador -->
      <div class="border-t border-black/20 my-4"></div>

      <!-- Aviso: en checkout de otro (bloqueado) -->
      <div
        v-if="inCheckoutByOthersProduct"
        class="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs"
      >
        Alguien está por comprar este producto. No podrás agregarlo hasta que finalice o expire su reserva.
      </div>

      <!-- Aviso: en bolsa de otro (urgencia) -->
      <div
        v-else-if="inCartByOthersProduct"
        class="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs"
      >
        Otro comprador lo quiere. Está en su bolsa. Agrégalo antes de que se lleve.
      </div>

      <!-- Botones de acción -->
      <div class="flex flex-col gap-3 mt-2">
        <a
          v-if="isInMyCart && !isBlocked"
          href="/cart"
          class="w-full bg-[#a4ac5b] text-white py-3 rounded-[15px] font-bold text-[15px] hover:opacity-90 transition-all active:scale-[0.98] text-center block"
        >
          Ya está en tu bolsa — Ver carrito
        </a>
        <button
          v-else
          @click="handleAddToCart"
          :disabled="isBlocked"
          class="w-full bg-[#a4ac5b] text-white py-3 rounded-[15px] font-bold text-[15px] hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isAdded ? '¡Añadido!' : (isBlocked ? 'No disponible' : 'Agregar a la Bolsa') }}
        </button>

        <button
          @click="handleToggleFavorite"
          :disabled="isFavoriteLoading"
          class="w-full bg-[#76624d] text-white py-3 rounded-[15px] font-bold text-[15px] hover:opacity-90 transition-all active:scale-[0.98]"
        >
          {{ isProductFavorite ? 'Guardado en Favoritos' : 'Agregar a Favoritos' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes heart-pop {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.3);
  }
  50% {
    transform: scale(0.9);
  }
  75% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.animate-heart-pop {
  animation: heart-pop 0.5s ease-out;
}
</style>
