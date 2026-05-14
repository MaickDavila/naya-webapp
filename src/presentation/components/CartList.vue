<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from "vue";
import { useCart } from "../../application/stores/cartStore";
import { useAuth } from "../../application/stores/authStore";
import { productCartPresenceService } from "../../infrastructure/services/ProductCartPresenceService";
import { useProductAvailability } from "../../application/composables/useProductAvailability";
import { formatPrice } from "../utils/formatters";

const { items, total, removeItem, loadCart, isLoaded } = useCart();
const { user, initAuth } = useAuth();

const productIds = computed(() => items.value.map((i) => i.id));
const userId = computed(() => user.value?.uid ?? "");
const { inCheckoutByOthers, inCartByOthers, unsubscribe } =
  useProductAvailability(productIds, userId);

// Track which seller groups are collapsed
const collapsedSellers = ref<Set<string>>(new Set());

const hasBlockedItems = computed(() => inCheckoutByOthers.value.size > 0);

/** Items disponibles para comprar (no están en checkout de otro) */
const availableItems = computed(() =>
  items.value.filter((i) => !inCheckoutByOthers.value.has(i.id)),
);
const hasAvailableItems = computed(() => availableItems.value.length > 0);

onMounted(async () => {
  await initAuth();
  await loadCart(user.value?.uid ?? undefined);
});

// Sincronizar presencia: al cargar con items + user, añadir presencia
watch(
  [items, user],
  async ([newItems, newUser]) => {
    const itemList = (newItems as typeof items.value) || [];
    const uid = (newUser as { uid: string } | null)?.uid;
    if (itemList.length > 0 && uid) {
      await Promise.all(
        itemList.map((i: { id: string }) =>
          productCartPresenceService.addPresence(i.id, uid),
        ),
      );
    }
  },
  { immediate: true },
);

const handleRemove = (itemId: string, itemTitle?: string) => {
  const title = itemTitle || "este producto";
  if (!confirm(`¿Eliminar "${title}" de tu bolsa?`)) return;

  if (user.value) {
    productCartPresenceService.removePresence(itemId, user.value.uid);
  }
  removeItem(itemId);
};

onUnmounted(() => {
  unsubscribe();
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
    const key = item.sellerId || "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        sellerName: item.sellerName || "Vendedor",
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

const goToCheckout = () => {
  if (items.value.length === 0) return;
  if (!hasAvailableItems.value) return;
  if (!user.value) {
    window.location.href = "/login?next=" + encodeURIComponent("/checkout");
    return;
  }
  window.location.href = "/checkout";
};

const canCheckout = computed(
  () => items.value.length > 0 && hasAvailableItems.value,
);
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-6 mx-auto lg:max-w-4xl lg:gap-8 lg:mx-0">
    <!-- Estado de Carga / Vacío -->
    <div
      v-if="!isLoaded || items.length === 0"
      class="flex flex-col items-center justify-center py-20 lg:py-28 text-center"
    >
      <div
        class="w-24 h-24 lg:w-28 lg:h-28 bg-background-secondary rounded-full flex items-center justify-center mb-6"
      >
        <svg
          class="w-10 h-10 lg:w-12 lg:h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      </div>
      <h2 class="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
        {{ !isLoaded ? "Cargando bolsa..." : "Tu bolsa está vacía" }}
      </h2>
      <p class="text-gray-500 mb-8 lg:text-base">
        {{
          !isLoaded
            ? "Estamos recuperando tus tesoros."
            : "Parece que aún no has encontrado ningún tesoro."
        }}
      </p>
      <a
        v-if="isLoaded"
        href="/"
        class="bg-primary text-white px-8 py-3 lg:py-4 rounded-2xl font-bold text-[15px] lg:text-base hover:bg-primary-dark transition-all"
      >
        Buscar productos
      </a>
    </div>

    <!-- Contenido del carrito: en desktop dos columnas (lista + resumen fijo) -->
    <div v-else class="w-full lg:flex lg:gap-8 lg:items-start">
      <!-- Columna izquierda: lista -->
      <div class="flex w-full flex-col gap-5 lg:flex-1 lg:min-w-0">
        <!-- Título con conteo -->
        <h2 class="text-[15px] lg:text-xl font-semibold text-black">
          Bolsa ({{ totalProductCount }}
          {{ totalProductCount === 1 ? "producto" : "productos" }})
        </h2>

        <!-- Grupos por vendedor -->
        <div
          v-for="group in sellerGroups"
          :key="group.sellerId"
          class="bg-[#eeeae6] rounded-[15px] lg:rounded-2xl overflow-hidden"
        >
          <!-- Header del vendedor -->
          <div class="flex items-center justify-between px-4 lg:px-5 pt-3 pb-2 lg:pt-4 lg:pb-3">
            <span class="text-xs lg:text-sm font-medium text-black">
              Vendido por {{ group.sellerName }}
            </span>
            <button @click="toggleSeller(group.sellerId)" class="p-1 lg:p-2 rounded-lg hover:bg-black/5 transition-colors">
              <svg
                class="w-4 h-4 lg:w-5 lg:h-5 text-black/50 transition-transform duration-200"
                :class="{ 'rotate-180': collapsedSellers.has(group.sellerId) }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
          </div>

          <!-- Separador -->
          <div class="mx-4 lg:mx-5 border-t border-black/15"></div>

          <!-- Productos (colapsable) -->
          <div
            v-show="!collapsedSellers.has(group.sellerId)"
            class="flex flex-col gap-2 p-4 pt-3 lg:p-5 lg:gap-3"
          >
            <div
              v-for="item in group.items"
              :key="item.id"
              class="rounded-[15px] flex items-center gap-3 lg:gap-4 p-2 pr-3 lg:p-4 relative transition-opacity"
              :class="[
                inCheckoutByOthers.has(item.id)
                  ? 'bg-gray-200 opacity-60'
                  : inCartByOthers.has(item.id)
                    ? 'bg-amber-50/50'
                    : 'bg-white',
              ]"
            >
              <!-- Imagen del producto -->
              <div
                class="w-[62px] h-[62px] lg:w-20 lg:h-20 rounded-sm lg:rounded-lg overflow-hidden flex-shrink-0 bg-gray-100"
              >
                <img
                  v-if="item.images && item.images[0]"
                  :src="item.images[0]"
                  :alt="item.title"
                  class="w-full h-full object-cover"
                  :class="{ grayscale: inCheckoutByOthers.has(item.id) }"
                />
                <div
                  v-else
                  class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs"
                >
                  Sin imagen
                </div>
              </div>

              <!-- Info del producto -->
              <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5 lg:gap-1">
                <span
                  class="text-xs lg:text-sm leading-tight truncate"
                  :class="
                    inCheckoutByOthers.has(item.id) || inCartByOthers.has(item.id)
                      ? 'text-gray-500'
                      : 'text-black'
                  "
                >
                  {{ item.title }}
                </span>
                <p
                  v-if="inCheckoutByOthers.has(item.id)"
                  class="text-[10px] lg:text-xs text-red-600 font-medium"
                >
                  Alguien está por comprarlo. Elimínalo para continuar.
                </p>
                <p
                  v-else-if="inCartByOthers.has(item.id)"
                  class="text-[10px] lg:text-xs text-amber-600 font-medium"
                >
                  Este artículo está en la bolsa de otro comprador.
                </p>
                <span
                  v-if="item.brand"
                  class="text-xs text-black/50 leading-tight"
                  >Marca: {{ item.brand }}</span
                >
                <div class="flex items-center justify-between">
                  <span
                    v-if="item.size"
                    class="text-xs leading-tight"
                    :class="
                      inCheckoutByOthers.has(item.id) ||
                      inCartByOthers.has(item.id)
                        ? 'text-gray-400'
                        : 'text-black'
                    "
                    >Talla: {{ item.size }}</span
                  >
                  <span
                    class="text-xs lg:text-sm font-semibold ml-auto"
                    :class="
                      inCheckoutByOthers.has(item.id) ||
                      inCartByOthers.has(item.id)
                        ? 'text-gray-500'
                        : 'text-black'
                    "
                    >{{ formatPrice(item.price) }}</span
                  >
                </div>
              </div>

              <!-- Botón eliminar -->
              <button
                @click="handleRemove(item.id, item.title)"
                class="p-2 flex-shrink-0 hover:bg-red-50 rounded-full transition-colors text-gray-400 hover:text-red-600"
                aria-label="Eliminar del carrito"
              >
                <svg
                  class="w-5 h-5 lg:w-6 lg:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Total del vendedor -->
          <div v-show="!collapsedSellers.has(group.sellerId)" class="px-4 pb-3 lg:px-5 lg:pb-4">
            <span class="text-xs lg:text-sm font-medium text-black">Total: {{ formatPrice(group.subtotal) }}</span>
          </div>
        </div>
      </div>

      <!-- Columna derecha (desktop): resumen fijo -->
      <div class="mt-5 w-full lg:mt-0 lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-24">
        <div class="rounded-[15px] border border-black/[0.06] bg-white px-4 py-4 shadow-sm lg:px-0 lg:py-0 lg:rounded-2xl lg:overflow-hidden lg:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          <!-- Encabezado del resumen (solo desktop) -->
          <div class="hidden lg:block bg-[#eeeae6] px-5 py-4">
            <p class="text-sm font-semibold uppercase tracking-wider text-black/70">Resumen</p>
          </div>

          <div class="space-y-4 lg:bg-white lg:px-5 lg:py-5 lg:space-y-5">
            <!-- Total a pagar -->
            <div class="flex items-baseline justify-between gap-4 lg:flex-col lg:items-stretch lg:gap-1">
              <span class="text-[15px] text-black/70 lg:text-sm">Total a pagar</span>
              <span class="text-[15px] lg:text-lg font-bold text-black">{{ formatPrice(total) }}</span>
            </div>

            <!-- Avisos -->
            <p
              v-if="hasBlockedItems && hasAvailableItems"
              class="rounded-xl px-4 py-3 text-xs lg:text-sm text-amber-700 bg-amber-50"
            >
              Algunos productos no están disponibles. Solo pagarás por los que sí lo están.
            </p>
            <p
              v-else-if="hasBlockedItems && !hasAvailableItems"
              class="rounded-xl px-4 py-3 text-xs lg:text-sm text-red-700 bg-red-50"
            >
              Todos tus productos están siendo comprados por otros. Espera unos minutos.
            </p>

            <!-- Botón Comprar Ahora -->
            <button
              type="button"
              @click="goToCheckout"
              :disabled="!canCheckout"
              class="w-full bg-primary text-white py-3.5 lg:py-4 rounded-xl font-bold text-[15px] lg:text-base hover:bg-primary-dark transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
            >
              Comprar Ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
