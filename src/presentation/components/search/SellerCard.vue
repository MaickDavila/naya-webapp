<script setup lang="ts">
interface Seller {
  id: string;
  name: string;
  photoURL?: string;
  productsCount: number;
}

interface Props {
  seller: Seller;
}

const { seller } = defineProps<Props>();

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}
</script>

<template>
  <a
    :href="`/sellers/${seller.id}`"
    class="flex flex-col items-center p-4 bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
  >
    <!-- Avatar -->
    <div
      class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden mb-3"
    >
      <img
        v-if="seller.photoURL"
        :src="seller.photoURL"
        :alt="seller.name"
        class="w-full h-full object-cover"
      />
      <span v-else class="text-2xl font-bold text-primary">
        {{ getInitial(seller.name) }}
      </span>
    </div>

    <!-- Nombre -->
    <h3 class="font-bold text-gray-800 text-sm text-center truncate w-full">
      {{ seller.name }}
    </h3>

    <!-- Cantidad de productos -->
    <span class="text-xs text-gray-400 mt-1">
      {{ seller.productsCount }} {{ seller.productsCount === 1 ? "producto" : "productos" }}
    </span>
  </a>
</template>
