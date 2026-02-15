<script setup lang="ts">
import type { User } from "../../domain/entities/User";
import type { Product } from "../../domain/entities/Product";
import ProductCard from "./ProductCard.vue";

interface Props {
  seller: User;
  products: Product[];
}

defineProps<Props>();
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header del Perfil -->
    <div class="flex items-start gap-4">
      <!-- Avatar cuadrado -->
      <div
        class="w-24 h-24 rounded-[15px] bg-gray-100 flex items-center justify-center text-white text-3xl font-black flex-shrink-0 overflow-hidden"
      >
        <img
          v-if="seller.photoURL"
          :src="seller.photoURL"
          :alt="seller.displayName"
          class="w-full h-full object-cover"
        />
        <span v-else class="bg-primary w-full h-full flex items-center justify-center">{{ seller.displayName?.charAt(0).toUpperCase() }}</span>
      </div>

      <div class="flex-1 min-w-0">
        <p class="text-[15px] text-black">
          @{{ seller.displayName?.replace(/\s+/g, '').toLowerCase() }}
        </p>
        <p class="text-[15px] font-bold text-black">
          {{ seller.displayName }}
        </p>
        <p class="text-[15px] text-black leading-snug mt-1">
          {{
            seller.biography ||
            "Este vendedor aún no ha añadido una biografía."
          }}
        </p>
      </div>
    </div>

    <!-- Grid de Productos -->
    <div
      v-if="products.length === 0"
      class="text-center py-12"
    >
      <p class="text-gray-400 font-medium">
        Este vendedor no tiene productos activos actualmente.
      </p>
    </div>

    <div
      v-else
      class="grid grid-cols-3 gap-2"
    >
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
      />
    </div>
  </div>
</template>
