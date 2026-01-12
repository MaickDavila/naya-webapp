<script setup lang="ts">
import type { User } from "../../domain/entities/User";
import type { Product } from "../../domain/entities/Product";
import ProductCard from "./ProductCard.vue";
import { formatDate } from "../utils/formatters";

interface Props {
  seller: User;
  products: Product[];
}

defineProps<Props>();
</script>

<template>
  <div class="flex flex-col gap-12">
    <!-- Header del Perfil -->
    <div
      class="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-black/5 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12"
    >
      <!-- Avatar con inicial o foto -->
      <div
        class="w-32 h-32 md:w-40 md:h-40 bg-primary rounded-full flex items-center justify-center text-white text-5xl md:text-6xl font-black shadow-xl shadow-primary/20 flex-shrink-0"
      >
        <img
          v-if="seller.photoURL"
          :src="seller.photoURL"
          :alt="seller.displayName"
          class="w-full h-full object-cover rounded-full"
        />
        <span v-else>{{ seller.displayName?.charAt(0).toUpperCase() }}</span>
      </div>

      <div class="flex-1 text-center md:text-left">
        <div class="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <h1 class="text-4xl font-black text-gray-900 tracking-tight">
            {{ seller.displayName }}
          </h1>
          <div
            class="flex items-center justify-center md:justify-start gap-2 bg-warning/10 px-4 py-1.5 rounded-full border border-warning/20"
          >
            <svg
              class="w-4 h-4 text-warning"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
            <span class="text-sm font-black text-warning">{{
              seller.rating || "Nuevo"
            }}</span>
            <span class="text-xs text-warning/60 font-bold"
              >({{ seller.reviewsCount || 0 }} reseñas)</span
            >
          </div>
        </div>

        <p class="text-gray-500 text-lg leading-relaxed mb-6 max-w-2xl">
          {{
            seller.biography ||
            "Este vendedor aún no ha añadido una biografía. Miembro desde " +
              formatDate(seller.createdAt)
          }}
        </p>

        <div class="flex flex-wrap justify-center md:justify-start gap-4">
          <div
            class="flex flex-col px-6 py-3 bg-background-secondary rounded-2xl border border-black/5"
          >
            <span
              class="text-[10px] font-black uppercase tracking-widest text-gray-400"
              >Productos</span
            >
            <span class="text-xl font-black text-gray-900">{{
              products.length
            }}</span>
          </div>
          <div
            v-if="seller.location"
            class="flex flex-col px-6 py-3 bg-background-secondary rounded-2xl border border-black/5"
          >
            <span
              class="text-[10px] font-black uppercase tracking-widest text-gray-400"
              >Ubicación</span
            >
            <span class="text-xl font-black text-gray-900">{{
              seller.location
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Lista de Productos del Vendedor -->
    <div class="flex flex-col gap-8">
      <div class="flex items-end justify-between border-b border-black/5 pb-6">
        <h2 class="text-3xl font-black text-gray-900 tracking-tight">
          Armario del Vendedor
        </h2>
        <p
          class="text-sm font-bold text-primary-light uppercase tracking-widest"
        >
          {{ products.length }} artículos disponibles
        </p>
      </div>

      <div
        v-if="products.length === 0"
        class="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-black/5"
      >
        <p class="text-gray-400 font-medium">
          Este vendedor no tiene productos activos actualmente.
        </p>
      </div>

      <div
        v-else
        class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12"
      >
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
        />
      </div>
    </div>
  </div>
</template>
