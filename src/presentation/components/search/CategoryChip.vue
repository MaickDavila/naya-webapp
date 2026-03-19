<script setup lang="ts">
import type { Category } from "../../../domain/entities/Category";

interface Props {
  category: Category;
}

const { category } = defineProps<Props>();

const routeKey = category.slug || category.name;
</script>

<template>
  <a
    :href="`/categories/${encodeURIComponent(routeKey)}`"
    class="flex items-center gap-3 px-4 py-3 lg:px-5 lg:py-4 bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
  >
    <!-- Imagen -->
    <div class="w-12 h-12 lg:w-14 lg:h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
      <img
        v-if="category.image"
        :src="category.image"
        :alt="category.name"
        class="w-full h-full object-cover"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-gray-400"
      >
        <svg class="w-6 h-6 lg:w-7 lg:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    </div>

    <!-- Nombre -->
    <span class="font-bold text-gray-800 text-sm lg:text-base">
      {{ category.name }}
    </span>

    <!-- Flecha -->
    <svg
      class="w-4 h-4 lg:w-5 lg:h-5 text-gray-400 ml-auto"
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
</template>
