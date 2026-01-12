<script setup lang="ts">
import type { Product } from "../../domain/entities/Product";
import { formatPrice } from "../utils/formatters";

interface Props {
  product: Product;
}

const { product } = defineProps<Props>();
</script>

<template>
  <a
    :href="`/products/${product.id}`"
    class="flex flex-col items-center group cursor-pointer"
  >
    <!-- Imagen con esquinas muy redondeadas y sombra suave -->
    <div
      class="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden bg-gray-100 shadow-md transition-transform duration-300 group-hover:scale-[1.02]"
    >
      <img
        :src="
          product.images[0] || 'https://via.placeholder.com/400x300?text=NAYA'
        "
        :alt="product.title"
        class="w-full h-full object-cover"
      />
      <!-- Badge de precio minimalista -->
      <div
        class="absolute bottom-3 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm"
      >
        <span class="text-xs font-black text-primary">{{
          formatPrice(product.price)
        }}</span>
      </div>
    </div>

    <!-- Título centrado debajo como en la imagen -->
    <h3
      class="mt-3 text-sm font-bold text-gray-800 tracking-tight text-center group-hover:text-primary transition-colors"
    >
      {{ product.title }}
    </h3>
    <span class="text-[10px] text-gray-400 uppercase tracking-widest">{{
      product.category
    }}</span>
  </a>
</template>

<style scoped></style>
