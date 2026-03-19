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
  <div class="bg-white rounded-2xl border border-black/5 overflow-hidden lg:max-w-md">
    <!-- Header colapsable (oculto en desktop: filtros siempre visibles) -->
    <button
      @click="isExpanded = !isExpanded"
      class="w-full px-4 py-3 lg:hidden flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
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

    <!-- Contenido de filtros: móvil colapsable, desktop siempre visible -->
    <div
      :class="[
        'px-4 pb-4 space-y-4 border-black/5',
        isExpanded ? 'border-t' : 'lg:border-0',
        'lg:pt-0 lg:pb-5 lg:px-5',
      ]"
    >
      <div
        :class="[
          'pt-4 lg:pt-0 lg:!space-y-5',
          !isExpanded && 'hidden lg:!block',
        ]"
      >
        <!-- Categorias -->
        <div>
          <label class="block text-xs lg:text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
            Categoría
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              @click="selectCategory(null)"
              :class="[
                'px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-medium transition-all',
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
                'px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-medium transition-all',
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
          <label class="block text-xs lg:text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
            Precio
          </label>
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 lg:gap-3">
            <div class="flex-1 flex items-center gap-2">
              <input
                v-model="minPriceInput"
                type="number"
                placeholder="Mín"
                min="0"
                class="w-full px-3 py-2 lg:py-2.5 rounded-xl border border-black/10 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span class="text-gray-400 flex-shrink-0">-</span>
              <input
                v-model="maxPriceInput"
                type="number"
                placeholder="Máx"
                min="0"
                class="w-full px-3 py-2 lg:py-2.5 rounded-xl border border-black/10 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              @click="applyFilters"
              class="px-4 py-2 lg:py-2.5 bg-primary text-white rounded-xl text-sm lg:text-base font-bold hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              Aplicar
            </button>
          </div>
        </div>

        <!-- Limpiar filtros -->
        <button
          v-if="selectedCategory || priceRange.min || priceRange.max"
          @click="clearFilters"
          class="text-sm lg:text-base text-gray-500 hover:text-gray-700 underline"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  </div>
</template>
