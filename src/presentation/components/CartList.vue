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
  <div class="flex flex-col gap-6">
    <!-- Estado de Carga / Vacío -->
    <div
      v-if="!isLoaded || items.length === 0"
      class="flex flex-col items-center justify-center py-20 text-center"
    >
      <div
        class="w-24 h-24 bg-background-secondary rounded-full flex items-center justify-center mb-6"
      >
        <svg
          class="w-10 h-10 text-gray-400"
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
      <h2 class="text-2xl font-bold text-gray-900 mb-2">
        {{ !isLoaded ? "Cargando bolsa..." : "Tu bolsa está vacía" }}
      </h2>
      <p class="text-gray-500 mb-8">
        {{
          !isLoaded
            ? "Estamos recuperando tus tesoros."
            : "Parece que aún no has encontrado ningún tesoro."
        }}
      </p>
      <a
        v-if="isLoaded"
        href="/"
        class="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary-dark transition-all"
      >
        Buscar productos
      </a>
    </div>

    <!-- Contenido del carrito -->
    <div v-else class="flex flex-col gap-5">
      <!-- Título con conteo -->
      <h2 class="text-[15px] font-normal text-black">
        Bolsa ({{ totalProductCount }}
        {{ totalProductCount === 1 ? "producto" : "productos" }})
      </h2>

      <!-- Grupos por vendedor -->
      <div
        v-for="group in sellerGroups"
        :key="group.sellerId"
        class="bg-[#eeeae6] rounded-[15px] overflow-hidden"
      >
        <!-- Header del vendedor -->
        <div class="flex items-center justify-between px-4 pt-3 pb-2">
          <span class="text-xs text-black"
            >Vendido por {{ group.sellerName }}</span
          >
          <button @click="toggleSeller(group.sellerId)" class="p-1">
            <svg
              class="w-4 h-4 text-black/50 transition-transform duration-200"
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
        <div class="mx-4 border-t border-black/15"></div>

        <!-- Productos (colapsable) -->
        <div
          v-show="!collapsedSellers.has(group.sellerId)"
          class="flex flex-col gap-2 p-4 pt-3"
        >
          <div
            v-for="item in group.items"
            :key="item.id"
            class="rounded-[15px] flex items-center gap-3 p-2 pr-3 relative transition-opacity"
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
              class="w-[62px] h-[62px] rounded-sm overflow-hidden flex-shrink-0 bg-gray-100"
            >
              <img
                :src="item.images[0]"
                :alt="item.title"
                class="w-full h-full object-cover"
                :class="{ grayscale: inCheckoutByOthers.has(item.id) }"
              />
            </div>

            <!-- Info del producto -->
            <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <span
                class="text-xs leading-tight truncate"
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
                class="text-[10px] text-red-600 font-medium"
              >
                Alguien está por comprarlo. Elimínalo para continuar.
              </p>
              <p
                v-else-if="inCartByOthers.has(item.id)"
                class="text-[10px] text-amber-600 font-medium"
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
                  class="text-xs font-normal ml-auto"
                  :class="
                    inCheckoutByOthers.has(item.id) ||
                    inCartByOthers.has(item.id)
                      ? 'text-gray-500'
                      : 'text-black'
                  "
                  >S/{{ item.price }}</span
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
                class="w-5 h-5"
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
        <div v-show="!collapsedSellers.has(group.sellerId)" class="px-4 pb-3">
          <span class="text-xs text-black">Total: S/{{ group.subtotal }}</span>
        </div>
      </div>

      <!-- Separador antes del total -->
      <div class="border-t border-black/15"></div>

      <!-- Total general -->
      <div class="px-0">
        <span class="text-[15px] text-black">Total: S/ {{ total }}</span>
      </div>

      <!-- Aviso si hay productos bloqueados pero hay disponibles -->
      <p
        v-if="hasBlockedItems && hasAvailableItems"
        class="text-xs text-amber-600"
      >
        Algunos productos no están disponibles. Solo pagarás por los que sí lo
        están.
      </p>
      <!-- Cuando todos están bloqueados -->
      <p
        v-else-if="hasBlockedItems && !hasAvailableItems"
        class="text-xs text-red-600"
      >
        Todos tus productos están siendo comprados por otros. Espera unos
        minutos.
      </p>

      <!-- Botón Comprar Ahora -->
      <button
        type="button"
        @click="goToCheckout"
        :disabled="!canCheckout"
        class="w-full bg-primary text-white py-3.5 rounded-[15px] font-bold text-[15px] hover:brightness-95 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Comprar Ahora
      </button>
    </div>
  </div>
</template>
