<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useAuth } from "../../application/stores/authStore";
import { useFavorites } from "../../application/stores/favoritesStore";
import { FirestoreProductRepository } from "../../infrastructure/repositories/FirestoreProductRepository";
import type { Product } from "../../domain/entities/Product";
import ProductCard from "./ProductCard.vue";

const { user, initAuth, loading: authLoading } = useAuth();
const { favoriteIds, loadFavorites, initialized, loading: favoritesLoading } = useFavorites();

const productRepo = new FirestoreProductRepository();

const products = ref<Product[]>([]);
const isLoadingProducts = ref(false);
const error = ref<string | null>(null);

const isLoading = computed(() => {
  return authLoading.value || favoritesLoading.value || isLoadingProducts.value;
});

async function loadFavoriteProducts() {
  if (favoriteIds.value.length === 0) {
    products.value = [];
    return;
  }

  isLoadingProducts.value = true;
  error.value = null;

  try {
    const productPromises = favoriteIds.value.map((id) => productRepo.getById(id));
    const results = await Promise.all(productPromises);
    products.value = results.filter((p): p is Product => p !== null);
  } catch (e) {
    console.error("Error loading favorite products:", e);
    error.value = "Error al cargar los productos favoritos";
  } finally {
    isLoadingProducts.value = false;
  }
}

onMounted(async () => {
  await initAuth();

  if (user.value) {
    await loadFavorites(user.value.uid);
    await loadFavoriteProducts();
  }
});

// Watch for user changes (in case auth loads after mount)
watch(
  () => user.value,
  async (newUser) => {
    if (newUser && !initialized.value) {
      await loadFavorites(newUser.uid);
      await loadFavoriteProducts();
    }
  }
);

// Reload products when favorites change
watch(
  () => favoriteIds.value.length,
  async (newLength, oldLength) => {
    if (initialized.value && newLength !== oldLength) {
      await loadFavoriteProducts();
    }
  }
);
</script>

<template>
  <!-- Loading State -->
  <div v-if="isLoading" class="grid grid-cols-2 gap-6">
    <div v-for="n in 4" :key="n" class="animate-pulse">
      <div class="aspect-[4/3] bg-gray-200 rounded-2xl mb-3"></div>
      <div class="h-4 bg-gray-200 rounded w-3/4 mb-2 mx-auto"></div>
      <div class="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
    </div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="text-center py-12">
    <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
    <p class="text-gray-600 font-medium">{{ error }}</p>
    <button
      @click="loadFavoriteProducts"
      class="mt-4 px-6 py-2 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary/90 transition-colors"
    >
      Reintentar
    </button>
  </div>

  <!-- Empty State -->
  <div v-else-if="products.length === 0" class="text-center py-16">
    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </div>
    <h3 class="text-lg font-bold text-gray-900 mb-2">No tienes favoritos</h3>
    <p class="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
      Guarda productos que te gusten para verlos aqui mas tarde
    </p>
    <a
      href="/"
      class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary/90 transition-colors"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      Explorar productos
    </a>
  </div>

  <!-- Products Grid -->
  <div v-else class="grid grid-cols-2 gap-x-6 gap-y-10">
    <ProductCard v-for="product in products" :key="product.id" :product="product" />
  </div>
</template>
