<script setup lang="ts">
import { ref, onMounted } from "vue";
import { FirestoreCategoryRepository } from "../../infrastructure/repositories/FirestoreCategoryRepository";
import { FirestoreProductRepository } from "../../infrastructure/repositories/FirestoreProductRepository";
import type { Category } from "../../domain/entities/Category";
import type { Product } from "../../domain/entities/Product";
import ProductCard from "./ProductCard.vue";

const props = defineProps<{ slug: string }>();

const categoryRepo = new FirestoreCategoryRepository();
const productRepo = new FirestoreProductRepository();

const isLoading = ref(true);
const category = ref<Category | null>(null);
const products = ref<Product[]>([]);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const decoded = decodeURIComponent(props.slug ?? "");
    const categories = await categoryRepo.getActive();
    category.value =
      categories.find((c) => (c.slug || c.name) === decoded) ?? null;

    if (category.value) {
      products.value = await productRepo.search({
        category: category.value.slug || category.value.name,
      });
    }
  } catch (e) {
    console.error("Error loading category/products:", e);
    error.value = "No se pudo cargar la categoría.";
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <!-- Loading -->
  <div v-if="isLoading">
    <div class="mb-6 lg:mb-10">
      <div class="h-8 w-48 bg-gray-200 rounded animate-pulse" />
    </div>
    <div class="grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-8">
      <div
        v-for="n in 8"
        :key="n"
        class="w-full bg-gray-200 rounded-2xl animate-pulse"
        style="aspect-ratio: 3/4;"
      />
    </div>
  </div>

  <!-- Error -->
  <div
    v-else-if="error"
    class="bg-error/5 border border-error/20 p-4 rounded-2xl mb-8"
  >
    <p class="text-error text-center font-bold">{{ error }}</p>
  </div>

  <!-- Not found -->
  <div v-else-if="!category" class="text-center py-16 lg:py-24">
    <h1 class="text-2xl lg:text-3xl font-black text-gray-900 mb-2">
      Categoría no encontrada
    </h1>
    <p class="text-gray-500 lg:text-lg">
      La categoría que buscas no existe o fue desactivada.
    </p>
  </div>

  <!-- Content -->
  <template v-else>
    <div class="mb-6 lg:mb-10">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[var(--color-text-primary)] tracking-tight"
      >
        {{ category.name }}
      </h1>
      <p
        v-if="category.description"
        class="text-[var(--color-text-secondary)] mt-2 lg:mt-3 max-w-2xl lg:max-w-3xl text-sm lg:text-base leading-relaxed"
      >
        {{ category.description }}
      </p>
      <p
        v-if="products.length > 0"
        class="mt-2 text-sm text-[var(--color-text-tertiary)]"
      >
        {{ products.length }}
        {{ products.length === 1 ? "producto" : "productos" }}
      </p>
    </div>

    <div v-if="products.length === 0" class="text-center py-16 lg:py-24">
      <p class="text-gray-400 font-medium italic text-base lg:text-lg">
        Aún no hay productos en esta categoría.
      </p>
    </div>
    <div
      v-else
      class="grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-8"
    >
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
      />
    </div>
  </template>
</template>
