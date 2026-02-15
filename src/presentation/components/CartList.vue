<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useCart } from '../../application/stores/cartStore';
import { useAuth } from '../../application/stores/authStore';
import { formatPrice } from '../utils/formatters';

const { items, total, removeItem, loadCart, isLoaded } = useCart();
const { user, initAuth } = useAuth();

// Track which seller groups are collapsed
const collapsedSellers = ref<Set<string>>(new Set());

// Track which item has open menu
const openMenuId = ref<string | null>(null);

onMounted(() => {
  initAuth();
  loadCart();
  // Close menu on outside click
  document.addEventListener('click', () => {
    openMenuId.value = null;
  });
});

// Group items by seller
interface SellerGroup {
  sellerName: string;
  sellerId: string;
  items: Array<(typeof items.value)[number]>;
  subtotal: number;
}

const sellerGroups = computed<SellerGroup[]>(() => {
  const groups = new Map<string, SellerGroup>();

  for (const item of [...items.value]) {
    const key = item.sellerId || 'unknown';
    if (!groups.has(key)) {
      groups.set(key, {
        sellerName: item.sellerName || 'Vendedor',
        sellerId: key,
        items: [],
        subtotal: 0,
      });
    }
    const group = groups.get(key)!;
    group.items.push(item);
    group.subtotal += item.price * item.quantity;
  }

  return Array.from(groups.values());
});

const totalProductCount = computed(() => items.value.length);

const toggleSeller = (sellerId: string) => {
  if (collapsedSellers.value.has(sellerId)) {
    collapsedSellers.value.delete(sellerId);
  } else {
    collapsedSellers.value.add(sellerId);
  }
};

const toggleMenu = (itemId: string, event: Event) => {
  event.stopPropagation();
  openMenuId.value = openMenuId.value === itemId ? null : itemId;
};

const handleRemove = (itemId: string) => {
  removeItem(itemId);
  openMenuId.value = null;
};

const goToCheckout = () => {
  if (items.value.length === 0) return;
  if (!user.value) {
    window.location.href = '/login?next=' + encodeURIComponent('/checkout');
    return;
  }
  window.location.href = '/checkout';
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Estado de Carga / Vacío -->
    <div v-if="!isLoaded || items.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-24 h-24 bg-background-secondary rounded-full flex items-center justify-center mb-6">
        <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-900 mb-2">
        {{ !isLoaded ? 'Cargando bolsa...' : 'Tu bolsa está vacía' }}
      </h2>
      <p class="text-gray-500 mb-8">
        {{ !isLoaded ? 'Estamos recuperando tus tesoros.' : 'Parece que aún no has encontrado ningún tesoro.' }}
      </p>
      <a v-if="isLoaded" href="/" class="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary-dark transition-all">
        Explorar productos
      </a>
    </div>

    <!-- Contenido del carrito -->
    <div v-else class="flex flex-col gap-5">
      <!-- Título con conteo -->
      <h2 class="text-[15px] font-normal text-black">
        Bolsa ({{ totalProductCount }} {{ totalProductCount === 1 ? 'producto' : 'productos' }})
      </h2>

      <!-- Grupos por vendedor -->
      <div
        v-for="group in sellerGroups"
        :key="group.sellerId"
        class="bg-[#eeeae6] rounded-[15px] overflow-hidden"
      >
        <!-- Header del vendedor -->
        <div class="flex items-center justify-between px-4 pt-3 pb-2">
          <span class="text-xs text-black">Vendido por {{ group.sellerName }}</span>
          <button @click="toggleSeller(group.sellerId)" class="p-1">
            <svg
              class="w-4 h-4 text-black/50 transition-transform duration-200"
              :class="{ 'rotate-180': collapsedSellers.has(group.sellerId) }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

        <!-- Separador -->
        <div class="mx-4 border-t border-black/15"></div>

        <!-- Productos (colapsable) -->
        <div
          v-show="!collapsedSellers.has(group.sellerId)"
          class="flex flex-col gap-2 p-4 pt-3"
        >
          <div
            v-for="item in group.items"
            :key="item.id"
            class="bg-white rounded-[15px] flex items-center gap-3 p-2 pr-3 relative"
          >
            <!-- Imagen del producto -->
            <div class="w-[62px] h-[62px] rounded-sm overflow-hidden flex-shrink-0 bg-gray-100">
              <img :src="item.images[0]" :alt="item.title" class="w-full h-full object-cover" />
            </div>

            <!-- Info del producto -->
            <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <span class="text-xs text-black leading-tight truncate">{{ item.title }}</span>
              <span v-if="item.brand" class="text-xs text-black/50 leading-tight">Marca: {{ item.brand }}</span>
              <div class="flex items-center justify-between">
                <span v-if="item.size" class="text-xs text-black leading-tight">Talla: {{ item.size }}</span>
                <span class="text-xs text-black font-normal ml-auto">S/{{ item.price }}</span>
              </div>
            </div>

            <!-- Menú 3 puntos -->
            <div class="relative flex-shrink-0">
              <button @click="toggleMenu(item.id, $event)" class="p-1.5 -mr-1">
                <div class="flex flex-col gap-[3px]">
                  <div class="w-[3px] h-[3px] rounded-full bg-black/50"></div>
                  <div class="w-[3px] h-[3px] rounded-full bg-black/50"></div>
                  <div class="w-[3px] h-[3px] rounded-full bg-black/50"></div>
                </div>
              </button>
              <!-- Dropdown menu -->
              <div
                v-if="openMenuId === item.id"
                class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-black/10 py-1 z-10 min-w-[140px]"
              >
                <button
                  @click="handleRemove(item.id)"
                  class="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Total del vendedor -->
        <div
          v-show="!collapsedSellers.has(group.sellerId)"
          class="px-4 pb-3"
        >
          <span class="text-xs text-black">Total: S/{{ group.subtotal }}</span>
        </div>
      </div>

      <!-- Separador antes del total -->
      <div class="border-t border-black/15"></div>

      <!-- Total general -->
      <div class="px-0">
        <span class="text-[15px] text-black">Total: S/ {{ total }}</span>
      </div>

      <!-- Botón Comprar Ahora -->
      <button
        type="button"
        @click="goToCheckout"
        :disabled="items.length === 0"
        class="w-full bg-[#a4ac5b] text-white py-3.5 rounded-[15px] font-bold text-[15px] hover:brightness-95 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Comprar Ahora
      </button>
    </div>
  </div>
</template>
