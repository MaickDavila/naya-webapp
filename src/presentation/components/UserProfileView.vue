<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useFirestore, useCollection } from 'vuefire';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../../application/stores/authStore';
import { ProductMapper } from '../../infrastructure/mappers/ProductMapper';
import { COLLECTIONS } from '../../domain/constants/collections';
import ProfileHeader from './ProfileHeader.vue';
import ProductCard from './ProductCard.vue';
import SellModal from './SellModal.vue';

const sellModalOpen = ref(false);

const { user, initAuth } = useAuth();
const db = useFirestore();

const productsQuery = computed(() =>
  user.value
    ? query(
        collection(db, COLLECTIONS.PRODUCTS),
        where('sellerId', '==', user.value.uid),
        orderBy('createdAt', 'desc')
      )
    : null
);

const { data: productsData, pending: loading } = useCollection(productsQuery, {
  wait: true,
});

const products = computed(() => {
  if (!productsData.value) return [];
  return productsData.value
    .map((doc: any) => ProductMapper.toDomain(doc.id, doc))
    .filter((p) => p.status === 'approved');
});

onMounted(() => {
  initAuth();
});
</script>

<template>
  <div v-if="user" class="flex flex-col gap-8">
    <ProfileHeader active-tab="for-sale" />

    <!-- Content: FOR SALE - Grid de productos -->
    <div v-if="loading" class="grid grid-cols-3 gap-2">
      <div v-for="n in 9" :key="n" class="animate-pulse">
        <div class="aspect-[125/155] bg-gray-200 rounded-lg" />
        <div class="mt-2 h-4 bg-gray-200 rounded w-3/4" />
        <div class="mt-1 h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>

    <div v-else-if="products.length === 0" class="text-center py-16">
      <div class="w-20 h-20 bg-background-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
        <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <h3 class="text-xl font-bold text-gray-900 mb-2">Tu armario esta vacio</h3>
      <p class="text-gray-500 text-sm mb-6">Sube una prenda y dale una segunda vida.</p>
      <button
        type="button"
        @click="sellModalOpen = true"
        class="inline-block bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-primary-dark transition-all"
      >
        Vender algo
      </button>
    </div>

    <div v-else class="grid grid-cols-3 gap-2">
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
      />
    </div>

    <SellModal :open="sellModalOpen" @close="sellModalOpen = false" />
  </div>
</template>
