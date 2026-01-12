<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { FirestoreProductRepository } from '../../infrastructure/repositories/FirestoreProductRepository';
import { FirestoreCategoryRepository } from '../../infrastructure/repositories/FirestoreCategoryRepository';
import { GetCategories } from '../../application/use-cases/GetCategories';
import type { Product } from '../../domain/entities/Product';
import type { Category } from '../../domain/entities/Category';
import ProductCard from './ProductCard.vue';

const productRepo = new FirestoreProductRepository();
const categoryRepo = new FirestoreCategoryRepository();
const getCategoriesUseCase = new GetCategories(categoryRepo);

const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const loading = ref(false);
const loadingCategories = ref(false);
const searchQuery = ref('');
const selectedCategory = ref('all');

const fetchCategories = async () => {
  loadingCategories.value = true;
  try {
    categories.value = await getCategoriesUseCase.execute();
  } catch (error) {
    console.error("Error cargando categorías:", error);
  } finally {
    loadingCategories.value = false;
  }
};

const performSearch = async () => {
  loading.value = true;
  try {
    products.value = await productRepo.search({
      query: searchQuery.value,
      category: selectedCategory.value
    });
  } catch (error) {
    console.error("Error en la búsqueda:", error);
  } finally {
    loading.value = false;
  }
};

// Debounce para la búsqueda por texto
let timeout: any;
watch(searchQuery, () => {
  clearTimeout(timeout);
  timeout = setTimeout(performSearch, 300);
});

// Búsqueda inmediata al cambiar categoría
watch(selectedCategory, performSearch);

onMounted(() => {
  fetchCategories();
  performSearch();
});
</script>

<template>
  <div class="flex flex-col gap-10">
    <!-- Barra de Búsqueda y Filtros -->
    <div class="flex flex-col gap-6 sticky top-24 z-40 bg-[#FDFCFB]/80 backdrop-blur-md pb-6 border-b border-black/5">
      <div class="relative group">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Busca tesoros únicos..." 
          class="w-full bg-white border-2 border-black/5 focus:border-primary/20 focus:ring-0 rounded-[2rem] py-5 px-8 pl-16 transition-all text-xl font-medium shadow-sm group-hover:shadow-md"
        />
        <svg class="w-8 h-8 text-gray-300 absolute left-6 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Categorías -->
      <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          @click="selectedCategory = 'all'"
          class="px-6 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all border-2"
          :class="selectedCategory === 'all' 
            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
            : 'bg-white border-black/5 text-gray-500 hover:border-gray-200'"
        >
          Todos
        </button>
        <button 
          v-for="cat in categories" 
          :key="cat.id"
          @click="selectedCategory = cat.slug || cat.name"
          class="px-6 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all border-2 flex items-center gap-2"
          :class="selectedCategory === (cat.slug || cat.name)
            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
            : 'bg-white border-black/5 text-gray-500 hover:border-gray-200'"
        >
          <span v-if="cat.icon" class="text-lg">{{ cat.icon }}</span>
          {{ cat.name }}
        </button>
      </div>
    </div>

    <!-- Resultados -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
      <p class="text-gray-400 font-medium italic">Buscando tesoros para ti...</p>
    </div>

    <div v-else-if="products.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="w-20 h-20 bg-background-secondary rounded-[2rem] flex items-center justify-center mb-6">
        <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h2 class="text-2xl font-black text-gray-900 mb-2">No encontramos nada</h2>
      <p class="text-gray-500 max-w-xs leading-relaxed">Prueba con otras palabras o cambia de categoría.</p>
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12 animate-in fade-in duration-700">
      <ProductCard v-for="product in products" :key="product.id" :product="product" />
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
