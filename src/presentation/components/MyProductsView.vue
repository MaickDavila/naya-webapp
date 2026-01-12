<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuth } from '../../application/stores/authStore';
import { FirestoreProductRepository } from '../../infrastructure/repositories/FirestoreProductRepository';
import type { Product } from '../../domain/entities/Product';
import ProductCard from './ProductCard.vue';

const { user, initAuth } = useAuth();
const products = ref<Product[]>([]);
const loading = ref(true);
const productRepo = new FirestoreProductRepository();

const fetchUserProducts = async () => {
  if (!user.value) return;
  
  loading.value = true;
  try {
    products.value = await productRepo.getBySellerId(user.value.uid);
  } catch (error) {
    console.error("Error fetching user products:", error);
  } finally {
    loading.value = false;
  }
};

// Observar cuando el usuario está listo para cargar sus productos
watch(user, (newUser) => {
  if (newUser) {
    fetchUserProducts();
  }
}, { immediate: true });

onMounted(() => {
  initAuth();
});
</script>

<template>
  <div class="flex flex-col gap-12">
    <div class="flex items-end justify-between border-b border-black/5 pb-6">
      <h1 class="text-4xl font-black text-gray-900 tracking-tight">Mis Productos</h1>
      <p v-if="!loading" class="text-sm font-bold text-primary-light uppercase tracking-widest">
        {{ products.length }} artículos en venta
      </p>
    </div>

    <!-- Estado de Carga -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
      <p class="text-gray-400 font-medium italic">Recuperando tu armario...</p>
    </div>

    <!-- Estado Vacío -->
    <div v-else-if="products.length === 0" class="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-black/5 text-center px-6">
      <div class="w-20 h-20 bg-background-secondary rounded-[2rem] flex items-center justify-center mb-6">
        <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <h2 class="text-2xl font-black text-gray-900 mb-2">Tu armario está vacío</h2>
      <p class="text-gray-500 mb-8 max-w-xs leading-relaxed">¿Tienes prendas que ya no usas? Dales una segunda vida y gana dinero.</p>
      <a href="/sell" class="bg-primary text-white px-8 py-4 rounded-[2rem] font-black text-lg hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span>Empezar a vender</span>
      </a>
    </div>

    <!-- Listado de Productos -->
    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12 animate-in fade-in duration-700">
      <div v-for="product in products" :key="product.id" class="relative group">
        <ProductCard :product="product" />
        
        <!-- Acciones rápidas para el dueño -->
        <div class="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-sm text-gray-700 hover:text-primary transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button class="bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-sm text-gray-700 hover:text-error transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
