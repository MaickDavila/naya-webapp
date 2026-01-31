<script setup lang="ts">
import { ref, watch } from "vue";
import type { Category } from "../../../domain/entities/Category";

interface Props {
  categories: Category[];
}

const props = defineProps<Props>();

const selectedCategory = defineModel<string | null>("selectedCategory");
const priceRange = defineModel<{ min: number; max: number }>("priceRange", {
  default: () => ({ min: 0, max: 0 }),
});

const emit = defineEmits<{
  filterChange: [];
}>();

const isExpanded = ref(false);

const minPriceInput = ref(priceRange.value.min || "");
const maxPriceInput = ref(priceRange.value.max || "");

function applyFilters() {
  priceRange.value = {
    min: Number(minPriceInput.value) || 0,
    max: Number(maxPriceInput.value) || 0,
  };
  emit("filterChange");
}

function clearFilters() {
  selectedCategory.value = null;
  minPriceInput.value = "";
  maxPriceInput.value = "";
  priceRange.value = { min: 0, max: 0 };
  emit("filterChange");
}

function getCategoryValue(category: Category): string {
  return category.slug || category.name;
}

function selectCategory(categoryValue: string | null) {
  selectedCategory.value = categoryValue;
  emit("filterChange");
}

watch(
  () => props.categories,
  () => {
    // Reset category if it no longer exists
    if (
      selectedCategory.value &&
      !props.categories.some((c) => getCategoryValue(c) === selectedCategory.value)
    ) {
      selectedCategory.value = null;
    }
  }
);
</script>

<template>
  <div class="bg-white rounded-2xl border border-black/5 overflow-hidden">
    <!-- Header colapsable -->
    <button
      @click="isExpanded = !isExpanded"
      class="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
    >
      <span class="font-bold text-gray-800 text-sm">Filtros</span>
      <div class="flex items-center gap-2">
        <span
          v-if="selectedCategory || priceRange.min || priceRange.max"
          class="text-xs text-primary font-medium"
        >
          Activos
        </span>
        <svg
          :class="['w-5 h-5 text-gray-400 transition-transform', { 'rotate-180': isExpanded }]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </button>

    <!-- Contenido de filtros -->
    <div v-show="isExpanded" class="px-4 pb-4 space-y-4 border-t border-black/5">
      <!-- Categorias -->
      <div class="pt-4">
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Categoria
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            @click="selectCategory(null)"
            :class="[
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              !selectedCategory
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ]"
          >
            Todas
          </button>
          <button
            v-for="category in categories"
            :key="category.id"
            @click="selectCategory(getCategoryValue(category))"
            :class="[
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              selectedCategory === getCategoryValue(category)
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ]"
          >
            {{ category.name }}
          </button>
        </div>
      </div>

      <!-- Rango de precio -->
      <div>
        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Precio
        </label>
        <div class="flex items-center gap-2">
          <div class="flex-1">
            <input
              v-model="minPriceInput"
              type="number"
              placeholder="Min"
              min="0"
              class="w-full px-3 py-2 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <span class="text-gray-400">-</span>
          <div class="flex-1">
            <input
              v-model="maxPriceInput"
              type="number"
              placeholder="Max"
              min="0"
              class="w-full px-3 py-2 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            @click="applyFilters"
            class="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>

      <!-- Limpiar filtros -->
      <button
        v-if="selectedCategory || priceRange.min || priceRange.max"
        @click="clearFilters"
        class="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Limpiar filtros
      </button>
    </div>
  </div>
</template>
