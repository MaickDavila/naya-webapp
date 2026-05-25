<script setup lang="ts">
import { ref, onMounted } from "vue";
import { FirestoreCategoryRepository } from "../../infrastructure/repositories/FirestoreCategoryRepository";
import { FirestoreUserRepository } from "../../infrastructure/repositories/FirestoreUserRepository";
import { GetCategories } from "../../application/use-cases/GetCategories";
import { GetSellers } from "../../application/use-cases/GetSellers";
import type { Category } from "../../domain/entities/Category";
import type { User } from "../../domain/entities/User";

type Tab = "perfiles" | "categorias";

const activeTab = ref<Tab>("perfiles");
const isLoading = ref(true);
const sellers = ref<User[]>([]);
const categories = ref<Category[]>([]);

const getCategories = new GetCategories(new FirestoreCategoryRepository());
const getSellers = new GetSellers(new FirestoreUserRepository());

onMounted(async () => {
  try {
    const [s, c] = await Promise.all([
      getSellers.execute(),
      getCategories.execute(),
    ]);
    sellers.value = s;
    categories.value = c;
  } catch (e) {
    console.error("Error fetching home data:", e);
  } finally {
    isLoading.value = false;
  }
});

function sellerName(seller: User): string {
  return seller.displayName || seller.name || "";
}

function nameLines(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

function categoryRouteKey(cat: Category): string {
  return encodeURIComponent(cat.slug || cat.name);
}
</script>

<template>
  <div>
    <!-- Tabs -->
    <div class="flex gap-2 mb-6 items-center justify-center">
      <button
        class="tab-btn px-7 rounded-full transition-all"
        :class="{ 'tab-active': activeTab === 'perfiles' }"
        @click="activeTab = 'perfiles'"
      >
        PERFILES
      </button>
      <button
        class="tab-btn px-7 rounded-full transition-all"
        :class="{ 'tab-active': activeTab === 'categorias' }"
        @click="activeTab = 'categorias'"
      >
        CATEGORÍAS
      </button>
    </div>

    <!-- Loading skeleton -->
    <div
      v-if="isLoading"
      class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3"
    >
      <div
        v-for="n in 12"
        :key="n"
        class="w-full rounded-2xl bg-gray-200 animate-pulse"
        style="aspect-ratio: 2/3;"
      />
    </div>

    <template v-else>
      <!-- Panel: Perfiles -->
      <div v-show="activeTab === 'perfiles'">
        <p
          v-if="sellers.length === 0"
          class="text-center text-gray-400 py-12"
        >
          No hay vendedoras disponibles aún.
        </p>
        <div
          v-else
          class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3"
        >
          <a
            v-for="seller in sellers"
            :key="seller.id"
            :href="`/sellers/${seller.id}`"
            class="relative block w-full overflow-hidden rounded-2xl shadow-sm active:scale-[0.97] transition-transform"
            style="aspect-ratio: 2/3;"
            :aria-label="`Ver perfil de ${sellerName(seller)}`"
          >
            <img
              v-if="seller.photoURL"
              :src="seller.photoURL"
              :alt="sellerName(seller)"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full bg-gray-200 flex items-center justify-center"
            >
              <span class="text-gray-400 text-2xl font-bold">
                {{ sellerName(seller).charAt(0).toUpperCase() }}
              </span>
            </div>
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent"
            />
            <span
              class="absolute bottom-2 right-2 text-white text-right uppercase"
              style="font-family: 'Jomhuria', serif; font-size: 1.875rem; line-height: 0.52;"
            >
              <span
                v-for="line in nameLines(sellerName(seller))"
                :key="line"
                class="block"
              >
                {{ line }}
              </span>
            </span>
          </a>
        </div>
      </div>

      <!-- Panel: Categorías -->
      <div v-show="activeTab === 'categorias'">
        <p
          v-if="categories.length === 0"
          class="text-center text-gray-400 py-12"
        >
          No hay categorías disponibles aún.
        </p>
        <div
          v-else
          class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3"
        >
          <a
            v-for="cat in categories"
            :key="cat.id"
            :href="`/categories/${categoryRouteKey(cat)}`"
            class="relative block w-full overflow-hidden rounded-2xl shadow-sm active:scale-[0.97] transition-transform"
            style="aspect-ratio: 2/3;"
            :aria-label="`Ver ${cat.name}`"
          >
            <img
              v-if="cat.image"
              :src="cat.image"
              :alt="cat.name"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full bg-gray-200 flex items-center justify-center"
            >
              <span class="text-gray-400 text-xs">Sin imagen</span>
            </div>
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent"
            />
            <span
              class="absolute bottom-2 right-2 text-white text-right uppercase leading-none"
              style="font-family: 'Jomhuria', serif; font-size: 1.875rem; line-height: 0.52;"
            >
              <span
                v-for="line in nameLines(cat.name)"
                :key="line"
                class="block"
              >
                {{ line }}
              </span>
            </span>
          </a>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tab-btn {
  background: #d9d2c8;
  border: 0;
  color: #ffffff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: "Jomhuria", serif;
  font-size: 1.75rem;
  line-height: 1;
  height: 2rem;
  min-width: 8.5rem;
  padding-top: 0.55rem;
  padding-bottom: 0.1rem;
  text-align: center;
  text-transform: uppercase;
}
.tab-btn.tab-active {
  background: #9a3043;
  color: #ffffff;
}
</style>
