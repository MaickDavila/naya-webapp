<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { Product } from "../../domain/entities/Product";

import { useAuth } from "../../application/stores/authStore";
import { useFavorites } from "../../application/stores/favoritesStore";
import { useToast } from "../../application/stores/toastStore";

interface Props {
  product: Product;
}

const { product } = defineProps<Props>();

const { user, initAuth } = useAuth();
const { isFavorite, toggleFavorite, loadFavorites, initialized } = useFavorites();
const { success } = useToast();

const isFavoriteLoading = ref(false);
const favoriteJustToggled = ref(false);

const isProductFavorite = computed(() => isFavorite(product.id));

// Inicializar auth y cargar favoritos
onMounted(async () => {
  await initAuth();
  if (user.value && !initialized.value) {
    await loadFavorites(user.value.uid);
  }
});

const handleToggleFavorite = async (event: Event) => {
  event.preventDefault();
  event.stopPropagation();

  if (!user.value) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    return;
  }

  const wasAlreadyFavorite = isFavorite(product.id);

  isFavoriteLoading.value = true;
  await toggleFavorite(user.value.uid, product.id);
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
</script>

<template>
  <div class="relative">
    <a
      :href="`/products/${product.id}`"
      class="block group cursor-pointer"
    >
      <!-- Imagen del producto -->
      <div
        class="relative w-full aspect-[4/5] overflow-hidden bg-gray-100"
      >
        <img
          :src="product.images[0] || 'https://via.placeholder.com/400x500?text=NAYA'"
          :alt="product.title"
          class="w-full h-full object-cover"
        />

        <!-- Boton de favorito -->
        <button
          @click="handleToggleFavorite"
          :disabled="isFavoriteLoading"
          :class="[
            'absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center',
            'transition-all duration-300 ease-out',
            'hover:scale-110 active:scale-90',
            isProductFavorite
              ? 'bg-primary text-white'
              : 'bg-white/80 backdrop-blur-sm text-gray-400 hover:text-primary'
          ]"
        >
          <svg
            v-if="isFavoriteLoading"
            class="w-4 h-4 animate-spin"
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
            :class="[
              'w-4 h-4 transition-transform duration-300',
              favoriteJustToggled ? 'animate-heart-pop' : ''
            ]"
            :fill="isProductFavorite ? 'currentColor' : 'none'"
            stroke="currentColor"
            :stroke-width="isProductFavorite ? '0' : '2'"
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
    </a>
  </div>
</template>

<style scoped>
@keyframes heart-pop {
  0% {
    transform: scale(1);
  }
  15% {
    transform: scale(1.4);
  }
  30% {
    transform: scale(0.85);
  }
  45% {
    transform: scale(1.2);
  }
  60% {
    transform: scale(0.95);
  }
  75% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.animate-heart-pop {
  animation: heart-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
</style>
