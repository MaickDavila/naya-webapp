<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { FirestoreProductRepository } from "../../infrastructure/repositories/FirestoreProductRepository";
import { FirestoreCategoryRepository } from "../../infrastructure/repositories/FirestoreCategoryRepository";
import type { Product } from "../../domain/entities/Product";
import type { Category } from "../../domain/entities/Category";
import ProductCard from "./ProductCard.vue";
import SearchFilters from "./search/SearchFilters.vue";
import SellerCard from "./search/SellerCard.vue";
import CategoryChip from "./search/CategoryChip.vue";

type TabType = "products" | "sellers" | "categories";

interface Seller {
  id: string;
  name: string;
  photoURL?: string;
  productsCount: number;
}

// Estado
const searchQuery = ref("");
const activeTab = ref<TabType>("products");
const selectedCategory = ref<string | null>(null);
const priceRange = ref({ min: 0, max: 0 });
const isLoading = ref(false);
const hasSearched = ref(false);

// Resultados
const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const sellers = ref<Seller[]>([]);

// Repositorios
const productRepo = new FirestoreProductRepository();
const categoryRepo = new FirestoreCategoryRepository();

// Tabs config
const tabs = [
  { key: "products" as TabType, label: "Productos" },
  { key: "sellers" as TabType, label: "Vendedores" },
  { key: "categories" as TabType, label: "Categorias" },
];

// Debounce search
let debounceTimer: ReturnType<typeof setTimeout>;

watch(searchQuery, (newQuery) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => executeSearch(newQuery), 300);
});

// Ejecutar busqueda
async function executeSearch(query?: string) {
  isLoading.value = true;
  hasSearched.value = true;

  try {
    const filters = {
      query: query || searchQuery.value || undefined,
      category: selectedCategory.value || undefined,
      minPrice: priceRange.value.min || undefined,
      maxPrice: priceRange.value.max || undefined,
    };

    products.value = await productRepo.search(filters);

    // Extraer vendedores unicos de los productos
    const sellerMap = new Map<string, Seller>();
    products.value.forEach((p) => {
      if (!sellerMap.has(p.sellerId)) {
        sellerMap.set(p.sellerId, {
          id: p.sellerId,
          name: p.sellerName,
          productsCount: 1,
        });
      } else {
        const existing = sellerMap.get(p.sellerId)!;
        existing.productsCount++;
      }
    });
    sellers.value = Array.from(sellerMap.values());

    // Filtrar categorias si hay query
    if (query) {
      const searchTerm = query.toLowerCase();
      categories.value = (await categoryRepo.getActive()).filter((c) =>
        c.name.toLowerCase().includes(searchTerm)
      );
    }
  } catch (error) {
    console.error("Error en busqueda:", error);
  } finally {
    isLoading.value = false;
  }
}

function handleFilterChange() {
  executeSearch();
}

onMounted(async () => {
  try {
    categories.value = await categoryRepo.getActive();
    // Cargar productos iniciales (todos aprobados)
    products.value = await productRepo.getApproved(50);

    // Extraer vendedores de productos iniciales
    const sellerMap = new Map<string, Seller>();
    products.value.forEach((p) => {
      if (!sellerMap.has(p.sellerId)) {
        sellerMap.set(p.sellerId, {
          id: p.sellerId,
          name: p.sellerName,
          productsCount: 1,
        });
      } else {
        const existing = sellerMap.get(p.sellerId)!;
        existing.productsCount++;
      }
    });
    sellers.value = Array.from(sellerMap.values());
  } catch (error) {
    console.error("Error cargando datos iniciales:", error);
  }
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Barra de busqueda -->
    <div class="relative">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar productos, marcas, vendedores..."
        class="w-full px-5 py-4 pl-12 bg-white rounded-2xl border border-black/5 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 placeholder-gray-400 font-medium"
      />
      <svg
        class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <!-- Clear button -->
      <button
        v-if="searchQuery"
        @click="searchQuery = ''"
        class="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
      >
        <svg class="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        :class="[
          'px-5 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap flex-shrink-0',
          activeTab === tab.key
            ? 'bg-primary text-white shadow-lg shadow-primary/20'
            : 'bg-white text-gray-600 border border-black/5 hover:bg-gray-50',
        ]"
      >
        {{ tab.label }}
        <span
          v-if="tab.key === 'products' && products.length > 0"
          class="ml-1.5 text-xs opacity-70"
        >
          ({{ products.length }})
        </span>
        <span
          v-else-if="tab.key === 'sellers' && sellers.length > 0"
          class="ml-1.5 text-xs opacity-70"
        >
          ({{ sellers.length }})
        </span>
      </button>
    </div>

    <!-- Filtros (solo para productos) -->
    <SearchFilters
      v-if="activeTab === 'products'"
      :categories="categories"
      v-model:selectedCategory="selectedCategory"
      v-model:priceRange="priceRange"
      @filter-change="handleFilterChange"
    />

    <!-- Loading State -->
    <div v-if="isLoading" class="grid grid-cols-2 gap-6">
      <div v-for="n in 6" :key="n" class="animate-pulse">
        <div class="aspect-[4/3] bg-gray-200 rounded-2xl mb-3"></div>
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-2 mx-auto"></div>
        <div class="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
      </div>
    </div>

    <!-- Resultados: Productos -->
    <div v-else-if="activeTab === 'products'">
      <div v-if="products.length > 0" class="grid grid-cols-2 gap-x-6 gap-y-10">
        <ProductCard v-for="product in products" :key="product.id" :product="product" />
      </div>
      <div v-else class="text-center py-12">
        <svg
          class="w-16 h-16 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p class="text-gray-400 font-medium">No se encontraron productos</p>
        <p v-if="searchQuery" class="text-gray-300 text-sm mt-1">
          Intenta con otros terminos de busqueda
        </p>
      </div>
    </div>

    <!-- Resultados: Vendedores -->
    <div v-else-if="activeTab === 'sellers'">
      <div v-if="sellers.length > 0" class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <SellerCard v-for="seller in sellers" :key="seller.id" :seller="seller" />
      </div>
      <div v-else class="text-center py-12">
        <svg
          class="w-16 h-16 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p class="text-gray-400 font-medium">No se encontraron vendedores</p>
      </div>
    </div>

    <!-- Resultados: Categorias -->
    <div v-else-if="activeTab === 'categories'">
      <div v-if="categories.length > 0" class="flex flex-col gap-3">
        <CategoryChip v-for="category in categories" :key="category.id" :category="category" />
      </div>
      <div v-else class="text-center py-12">
        <svg
          class="w-16 h-16 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p class="text-gray-400 font-medium">No hay categorias disponibles</p>
      </div>
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
