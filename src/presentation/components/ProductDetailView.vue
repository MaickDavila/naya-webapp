<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import type { Product } from "../../domain/entities/Product";
import type { User } from "../../domain/entities/User";
import { CONDITION_LABELS } from "../../domain/entities/Product";
import { FirestoreUserRepository } from "../../infrastructure/repositories/FirestoreUserRepository";
import { useCart } from "../../application/stores/cartStore";
import { useAuth } from "../../application/stores/authStore";
import { useFavorites } from "../../application/stores/favoritesStore";
import { useToast } from "../../application/stores/toastStore";
import { productCartPresenceService } from "../../infrastructure/services/ProductCartPresenceService";
import { productViewersService } from "../../infrastructure/services/ProductViewersService";
import { useProductAvailability } from "../../application/composables/useProductAvailability";
import { formatPrice } from "../utils/formatters";

const props = defineProps<{
  product: Product;
}>();

const userRepository = new FirestoreUserRepository();
const { addItem, items, loadCart } = useCart();
const { user, initAuth } = useAuth();

const seller = ref<User | null>(null);
const { isFavorite, toggleFavorite, loadFavorites } = useFavorites();
const { success } = useToast();

const productIds = computed(() => [props.product.id]);
const userId = computed(() => user.value?.uid ?? "");
const { inCheckoutByOthers, inCartByOthers, unsubscribe } =
  useProductAvailability(productIds, userId);

const inCheckoutByOthersProduct = computed(() =>
  inCheckoutByOthers.value.has(props.product.id),
);
const inCartByOthersProduct = computed(() =>
  inCartByOthers.value.has(props.product.id),
);
const isBlocked = computed(() => inCheckoutByOthersProduct.value);

/** El producto ya está en la bolsa del usuario actual */
const isInMyCart = computed(() =>
  items.value.some((i) => i.id === props.product.id),
);

const viewerCount = ref(0);
let unsubscribeViewers: (() => void) | null = null;
let currentViewerId: string | undefined;

const activeImage = ref(
  props.product.images[0] || "https://via.placeholder.com/600x800?text=NAYA",
);
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
  await loadFavorites(user.value?.uid ?? undefined);

  if (props.product.sellerId) {
    const s = await userRepository.getById(props.product.sellerId);
    seller.value = s;
  }

  currentViewerId = user.value?.uid;
  await productViewersService.addViewer(props.product.id, currentViewerId);
  unsubscribeViewers = productViewersService.subscribeToViewerCount(
    props.product.id,
    (count) => {
      viewerCount.value = count;
    },
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
  if (
    !props.product.originalPrice ||
    props.product.originalPrice <= props.product.price
  ) {
    return 0;
  }
  return Math.round(
    (1 - props.product.price / props.product.originalPrice) * 100,
  );
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
        <img
          :src="activeImage"
          :alt="product.title"
          class="w-full h-full object-cover"
        />
      </div>
    </div>

    <!-- Dots de paginación -->
    <div
      v-if="product.images.length > 1"
      class="flex justify-center gap-2 mb-4"
    >
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
        <button
          @click="handleToggleFavorite"
          :disabled="isFavoriteLoading"
          class="flex-shrink-0"
        >
          <svg
            v-if="isFavoriteLoading"
            class="w-4 h-4 animate-spin text-black/50"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
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
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>
      <p v-if="viewerCount > 0" class="text-xs text-black/50">
        {{ viewerCount }}
        {{ viewerCount === 1 ? "persona viendo" : "personas viendo" }} ahora
      </p>
    </div>

    <!-- Sección DETALLE -->
    <div class="px-2">
      <p class="text-[15px] text-black/50 mb-1">DETALLE</p>
      <div class="border-t border-black/20 mb-3"></div>

      <p v-if="product.category" class="text-xs text-black/50 mb-1">
        {{ product.category }}
      </p>

      <div class="flex flex-col gap-1 mb-4">
        <div class="flex gap-2">
          <span class="text-xs text-black/50">Precio:</span>
          <span class="text-xs text-black">{{
            formatPrice(product.price)
          }}</span>
          <span
            v-if="product.originalPrice && discountPercentage > 0"
            class="text-xs text-black/40 line-through"
            >{{ formatPrice(product.originalPrice) }}</span
          >
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

      <!-- Sección CONDICION -->
      <p class="text-[15px] text-black/50 mb-1">CONDICION</p>
      <div class="border-t border-black/20 mb-3"></div>

      <div class="flex flex-col gap-1 mb-4">
        <div v-if="conditionLabel" class="flex gap-2">
          <span class="text-xs text-black/50">Estado:</span>
          <span class="text-xs text-black">{{ conditionLabel }}</span>
        </div>
        <div v-if="product.description">
          <span class="text-xs text-black/50">Descripcion:</span>
          <p class="text-xs text-black mt-1 leading-relaxed">
            {{ product.description }}
          </p>
        </div>
      </div>

      <!-- Sección VENDIDO POR -->
      <div v-if="product.sellerId" class="mb-4">
        <p class="text-[15px] text-black/50 mb-1">VENDIDO POR</p>
        <div class="border-t border-black/20 mb-3"></div>
        <div class="flex items-start gap-4">
          <a
            :href="`/sellers/${product.sellerId}`"
            class="flex-shrink-0 hover:opacity-90 transition-opacity"
          >
            <div
              class="w-20 h-20 rounded-[15px] overflow-hidden bg-gray-100 flex items-center justify-center"
            >
              <img
                v-if="seller?.photoURL"
                :src="seller.photoURL"
                :alt="product.sellerName"
                class="w-full h-full object-cover"
              />
              <span
                v-else
                class="w-full h-full bg-primary flex items-center justify-center text-white font-bold text-2xl"
              >
                {{
                  (product.sellerName || seller?.displayName || "?")
                    ?.charAt(0)
                    .toUpperCase()
                }}
              </span>
            </div>
          </a>
          <div class="flex-1 min-w-0">
            <a
              :href="`/sellers/${product.sellerId}`"
              class="block hover:opacity-90 transition-opacity"
            >
              <p class="text-[15px] font-bold text-black">
                {{
                  seller?.displayName ||
                  seller?.name ||
                  product.sellerName ||
                  "Vendedor"
                }}
              </p>
              <p
                v-if="seller?.biography"
                class="text-[15px] text-black font-normal leading-snug mt-1"
              >
                {{ seller.biography }}
              </p>
            </a>
            <a
              v-if="seller?.instagram"
              :href="`https://instagram.com/${seller.instagram.replace(/^@/, '')}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[15px] text-black font-normal mt-1 block hover:underline"
            >
              Instagram:
              {{
                seller.instagram.startsWith("@")
                  ? seller.instagram
                  : `@${seller.instagram}`
              }}
            </a>
            <a
              :href="`/sellers/${product.sellerId}`"
              class="text-xs text-black/50 mt-2 block hover:underline"
            >
              Ver perfil del vendedor
            </a>
          </div>
          <a
            :href="`/sellers/${product.sellerId}`"
            class="flex-shrink-0 mt-1 hover:opacity-90 transition-opacity"
          >
            <svg
              class="w-5 h-5 text-black/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        </div>
      </div>

      <!-- Aviso: en checkout de otro (bloqueado) -->
      <div
        v-if="inCheckoutByOthersProduct"
        class="my-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs"
      >
        Alguien está por comprar este producto. No podrás agregarlo hasta que
        finalice o expire su reserva.
      </div>

      <!-- Aviso: en bolsa de otro (urgencia) -->
      <div
        v-else-if="inCartByOthersProduct"
        class="my-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs"
      >
        Otro comprador lo quiere. Está en su bolsa. Agrégalo antes de que se
        lleve.
      </div>

      <!-- Botones de acción -->
      <div class="flex flex-col gap-3 mt-2">
        <a
          v-if="isInMyCart && !isBlocked"
          href="/cart"
          class="w-full bg-primary text-white py-3 rounded-[15px] font-bold text-[15px] hover:opacity-90 transition-all active:scale-[0.98] text-center block"
        >
          Ya está en tu bolsa — Ver carrito
        </a>
        <button
          v-else
          @click="handleAddToCart"
          :disabled="isBlocked"
          class="w-full bg-primary text-white py-3 rounded-[15px] font-bold text-[15px] hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{
            isAdded
              ? "¡Añadido!"
              : isBlocked
                ? "No disponible"
                : "Agregar a la Bolsa"
          }}
        </button>

        <button
          @click="handleToggleFavorite"
          :disabled="isFavoriteLoading"
          :class="[
            'w-full py-3 rounded-[15px] font-bold text-[15px] transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-white border-2',
            isProductFavorite
              ? 'border-primary text-primary'
              : 'border-black/20 text-black',
            isFavoriteLoading && 'opacity-50 cursor-not-allowed',
          ]"
        >
          <svg
            v-if="isProductFavorite"
            class="w-5 h-5 text-primary animate-heart-pop"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              d="M10 17.25l-6.447-6.206A4.752 4.752 0 013.25 7.2C3.25 4.626 5.44 2.5 8.02 2.5A4.437 4.437 0 0110 3.35a4.437 4.437 0 011.98-.85c2.58 0 4.77 2.126 4.77 4.7a4.752 4.752 0 01-.303 3.844L10 17.25z"
            />
          </svg>
          <svg
            v-else
            class="w-5 h-5 text-black/40"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10 17.25l-6.447-6.206A4.752 4.752 0 013.25 7.2C3.25 4.626 5.44 2.5 8.02 2.5A4.437 4.437 0 0110 3.35a4.437 4.437 0 011.98-.85c2.58 0 4.77 2.126 4.77 4.7a4.752 4.752 0 01-.303 3.844L10 17.25z"
            />
          </svg>
          <span>
            {{
              isProductFavorite
                ? "Guardado en Favoritos"
                : "Agregar a Favoritos"
            }}
          </span>
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
