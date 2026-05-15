<script setup lang="ts">
import { ref, onMounted } from "vue";
import { FirestoreProductRepository } from "../../infrastructure/repositories/FirestoreProductRepository";
import type { Product } from "../../domain/entities/Product";
import ProductDetailView from "./ProductDetailView.vue";

const props = defineProps<{ id: string }>();

const productRepo = new FirestoreProductRepository();

const isLoading = ref(true);
const product = ref<Product | null>(null);

onMounted(async () => {
  try {
    product.value = await productRepo.getById(props.id);
  } catch (e) {
    console.error("Error loading product:", e);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="isLoading" class="space-y-4">
    <div
      class="w-full bg-gray-200 rounded-2xl animate-pulse"
      style="aspect-ratio: 1/1;"
    />
    <div class="h-7 w-2/3 bg-gray-200 rounded animate-pulse" />
    <div class="h-5 w-1/3 bg-gray-200 rounded animate-pulse" />
  </div>

  <div v-else-if="!product" class="text-center py-16 lg:py-24">
    <h1 class="text-2xl lg:text-3xl font-black text-gray-900 mb-2">
      Producto no encontrado
    </h1>
    <p class="text-gray-500 lg:text-lg">
      El producto que buscas no existe o fue retirado.
    </p>
  </div>

  <ProductDetailView v-else :product="product" />
</template>
