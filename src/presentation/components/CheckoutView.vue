<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useCart } from "../../application/stores/cartStore";
import { useAuth } from "../../application/stores/authStore";
import { useShipping } from "../../application/stores/shippingStore";
import { paymentService } from "../../infrastructure/services/PaymentService";
import { productReservationService } from "../../infrastructure/services/ProductReservationService";
import { productCartPresenceService } from "../../infrastructure/services/ProductCartPresenceService";
import { useProductAvailability } from "../../application/composables/useProductAvailability";
import { formatPrice } from "../utils/formatters";
import type { CheckoutItem } from "../../domain/entities/Transaction";
import AddressSelector from "./shipping/AddressSelector.vue";

const PAID_ITEMS_KEY = "naya_paid_product_ids";
const EXPIRES_AT_KEY = "naya_checkout_expires_at";
const RESERVATION_MS = 10 * 60 * 1000; // 10 minutos
const ALERT_AUTO_RELEASE_MS = 30 * 1000; // 30 segundos para responder

const { items, loadCart } = useCart();
const { user, initAuth } = useAuth();
const { selectedAddress, shippingCost, loadAddresses } = useShipping();

const productIds = computed(() => items.value.map((i) => i.id));
const userId = computed(() => user.value?.uid ?? "");
const { inCheckoutByOthers, unsubscribe } = useProductAvailability(
  productIds,
  userId,
);

/** Solo los items que SÍ podemos pagar (no están en checkout de otro) */
const payableItems = computed(() =>
  items.value.filter((item) => !inCheckoutByOthers.value.has(item.id)),
);

const payableSubtotal = computed(() =>
  payableItems.value.reduce((acc, item) => acc + item.price * item.quantity, 0),
);
const payableServiceFee = computed(
  () => Math.round(payableSubtotal.value * 0.1 * 100) / 100,
);
const payableTotal = computed(
  () => payableSubtotal.value + payableServiceFee.value,
);

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let alertAutoReleaseTimer: ReturnType<typeof setTimeout> | null = null;
const isRedirectingToPayment = ref(false);
const showExpiryAlert = ref(false);
const timeRemainingSeconds = ref<number | null>(null);
let countdownInterval: ReturnType<typeof setInterval> | null = null;

/** IDs que nosotros reservamos al entrar; usarlos al salir para liberar */
const reservedProductIds = ref<string[]>([]);

const isProcessing = ref(false);
const error = ref<string | null>(null);

// Costo de envio (0 si no hay direccion seleccionada)
const shippingPrice = computed(() => shippingCost.value?.price || 0);

// Total final incluyendo envio
const grandTotal = computed(() => payableTotal.value + shippingPrice.value);

// Verificar si puede proceder al pago
const canCheckout = computed(() => {
  return (
    payableItems.value.length > 0 &&
    user.value &&
    selectedAddress.value &&
    !isProcessing.value
  );
});

/**
 * Procesar pago con MercadoPago (solo items disponibles)
 */
const handleCheckout = async (event?: Event) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!user.value) {
    error.value = "Debes iniciar sesion para continuar";
    window.location.href = "/login?next=" + encodeURIComponent("/checkout");
    return;
  }

  if (payableItems.value.length === 0) {
    error.value = "No hay productos disponibles para pagar en este momento";
    return;
  }

  if (!selectedAddress.value) {
    error.value = "Debes seleccionar una direccion de envio";
    return;
  }

  isProcessing.value = true;
  error.value = null;

  try {
    const checkoutItems: CheckoutItem[] = payableItems.value.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      quantity: item.quantity,
      imageUrl: item.images?.[0],
      sellerId: item.sellerId,
      sellerName: item.sellerName,
    }));

    const preference = await paymentService.createPreference(checkoutItems, {
      id: user.value.uid,
      name: user.value.displayName || "Usuario",
      email: user.value.email || "",
    });

    if (!preference.initPoint) {
      throw new Error("No se recibio una URL de pago valida");
    }

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(
        PAID_ITEMS_KEY,
        JSON.stringify(payableItems.value.map((i) => i.id)),
      );
    }

    clearTimers();
    clearStoredExpiresAt();
    isRedirectingToPayment.value = true;
    paymentService.redirectToPayment(preference.initPoint);
  } catch (err: any) {
    console.error("Error al procesar pago:", err);
    error.value = err.message || "Error al procesar el pago. Intenta de nuevo.";
    isProcessing.value = false;
  }
};

const storeExpiresAt = (expiresAt: number) => {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
  }
};

const getStoredExpiresAt = (): number | null => {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(EXPIRES_AT_KEY);
  if (!raw) return null;
  const expiresAt = parseInt(raw, 10);
  return isNaN(expiresAt) ? null : expiresAt;
};

const clearStoredExpiresAt = () => {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(EXPIRES_AT_KEY);
  }
};

const setupReservations = async () => {
  const payableIds = payableItems.value.map((i) => i.id);
  if (payableIds.length === 0 || !user.value) return;

  reservedProductIds.value = [...payableIds];

  const storedExpiresAt = getStoredExpiresAt();
  const hasValidReservation = storedExpiresAt && storedExpiresAt > Date.now();

  if (hasValidReservation) {
    if (!heartbeatInterval) {
      heartbeatInterval = setInterval(async () => {
        if (user.value && payableItems.value.length > 0) {
          const ids = payableItems.value.map((i) => i.id);
          await productReservationService.extendReservations(
            ids,
            user.value!.uid,
          );
          storeExpiresAt(Date.now() + RESERVATION_MS);
        }
      }, productReservationService.getHeartbeatInterval());
    }
    startReservationTimer();
    return;
  }

  await productCartPresenceService.removePresencesForCheckout(
    payableIds,
    user.value.uid,
  );
  await productReservationService.reserveProducts(payableIds, user.value.uid);
  storeExpiresAt(Date.now() + RESERVATION_MS);

  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(async () => {
      if (user.value && payableItems.value.length > 0) {
        const ids = payableItems.value.map((i) => i.id);
        await productReservationService.extendReservations(
          ids,
          user.value!.uid,
        );
        storeExpiresAt(Date.now() + RESERVATION_MS);
      }
    }, productReservationService.getHeartbeatInterval());
  }

  startReservationTimer();
};

/**
 * Libera nuestras reservas y restaura presencia en bolsa.
 * Usado al salir de checkout (onUnmounted, beforeunload, pagehide).
 */
const releaseOnLeave = () => {
  if (isRedirectingToPayment.value) return;
  const ids =
    reservedProductIds.value.length > 0
      ? reservedProductIds.value
      : payableItems.value.map((i) => i.id);
  const uid = user.value?.uid;
  if (ids.length > 0 && uid) {
    clearStoredExpiresAt();
    productReservationService.releaseReservations(ids, uid);
    ids.forEach((id) =>
      productCartPresenceService.addPresence(id, uid).catch(() => {}),
    );
  }
};

const clearTimers = () => {
  if (alertAutoReleaseTimer) {
    clearTimeout(alertAutoReleaseTimer);
    alertAutoReleaseTimer = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  timeRemainingSeconds.value = null;
};

const releaseAndRedirectToCart = async () => {
  clearTimers();
  clearStoredExpiresAt();
  showExpiryAlert.value = false;
  const payableIds = payableItems.value.map((i) => i.id);
  if (payableIds.length > 0 && user.value) {
    await productReservationService.releaseReservations(
      payableIds,
      user.value.uid,
    );
    await Promise.all(
      payableIds.map((id) =>
        productCartPresenceService.addPresence(id, user.value!.uid),
      ),
    );
  }
  window.location.href = "/cart";
};

const handleExtendReservation = async () => {
  if (alertAutoReleaseTimer) {
    clearTimeout(alertAutoReleaseTimer);
    alertAutoReleaseTimer = null;
  }
  showExpiryAlert.value = false;
  const payableIds = payableItems.value.map((i) => i.id);
  if (payableIds.length > 0 && user.value) {
    await productReservationService.extendReservations(
      payableIds,
      user.value.uid,
    );
    storeExpiresAt(Date.now() + RESERVATION_MS);
  }
  startReservationTimer();
};

const handleReleaseAndRedirect = () => {
  releaseAndRedirectToCart();
};

const startReservationTimer = () => {
  clearTimers();

  let expiresAt = getStoredExpiresAt();
  if (!expiresAt || expiresAt <= Date.now()) {
    expiresAt = Date.now() + RESERVATION_MS;
    storeExpiresAt(expiresAt);
  }

  const updateCountdown = () => {
    const remaining = Math.max(0, Math.floor((expiresAt! - Date.now()) / 1000));
    timeRemainingSeconds.value = remaining;
    if (remaining <= 0) {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      timeRemainingSeconds.value = null;
      if (!isRedirectingToPayment.value) {
        showExpiryAlert.value = true;
        alertAutoReleaseTimer = setTimeout(() => {
          releaseAndRedirectToCart();
        }, ALERT_AUTO_RELEASE_MS);
      }
    }
  };

  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
};

const formatTimeRemaining = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const handlePageLeave = () => {
  releaseOnLeave();
};

onMounted(async () => {
  await initAuth();
  await loadCart(user.value?.uid ?? undefined);

  if (user.value) {
    await loadAddresses(user.value.uid);
  }

  window.addEventListener("beforeunload", handlePageLeave);
  window.addEventListener("pagehide", handlePageLeave);

  // Esperar a que useProductAvailability tenga datos antes de reservar
  setTimeout(() => {
    if (payableItems.value.length > 0 && user.value) {
      setupReservations();
    }
  }, 350);
});

onUnmounted(() => {
  console.log("onUnmounted");
  setTimeout(() => {
    window.removeEventListener("beforeunload", handlePageLeave);
    window.removeEventListener("pagehide", handlePageLeave);
    clearTimers();
    unsubscribe();
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    releaseOnLeave();
  }, 5000);
});
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Columna izquierda: Productos y Direccion -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Lista de productos -->
        <div
          class="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-black/5"
        >
          <h2 class="text-2xl font-black text-gray-900 mb-6">Tu Carrito</h2>

          <!-- Carrito vacio -->
          <div v-if="items.length === 0" class="text-center py-12">
            <svg
              class="w-16 h-16 mx-auto text-gray-300 mb-4"
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
            <p class="text-gray-500 mb-4">Tu carrito esta vacio</p>
            <a href="/" class="text-primary font-bold hover:underline"
              >Explorar productos</a
            >
          </div>

          <!-- Items del carrito -->
          <div v-else class="space-y-4">
            <div
              v-for="item in items"
              :key="item.id"
              class="flex gap-4 p-4 rounded-2xl"
              :class="
                inCheckoutByOthers.has(item.id)
                  ? 'bg-gray-100 opacity-60'
                  : 'bg-gray-50'
              "
            >
              <div
                class="w-20 h-20 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0"
              >
                <img
                  v-if="item.images?.[0]"
                  :src="item.images[0]"
                  :alt="item.title"
                  class="w-full h-full object-cover"
                  :class="{ grayscale: inCheckoutByOthers.has(item.id) }"
                />
              </div>

              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-gray-900 truncate">
                  {{ item.title }}
                </h3>
                <p class="text-sm text-gray-500">
                  Vendido por {{ item.sellerName }}
                </p>
                <p class="text-sm text-gray-400">
                  Cantidad: {{ item.quantity }}
                </p>
                <p
                  v-if="inCheckoutByOthers.has(item.id)"
                  class="text-xs text-red-600 font-medium mt-1"
                >
                  No disponible: alguien está por comprarlo
                </p>
              </div>

              <div class="text-right">
                <p class="font-black text-gray-900">
                  {{ formatPrice(item.price * item.quantity) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Selector de direccion -->
        <div
          v-if="items.length > 0 && user"
          class="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-black/5"
        >
          <AddressSelector />
        </div>
      </div>

      <!-- Columna derecha: Resumen de pago -->
      <div class="lg:col-span-1">
        <div
          class="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-black/5 sticky top-24"
        >
          <h2 class="text-xl font-black text-gray-900 mb-6">Resumen</h2>

          <!-- Tiempo restante para completar el pago -->
          <div
            v-if="timeRemainingSeconds !== null && payableItems.length > 0"
            class="mb-6 p-3 rounded-xl flex items-center justify-between"
            :class="
              timeRemainingSeconds <= 60
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-primary/5'
            "
          >
            <span
              class="text-sm"
              :class="
                timeRemainingSeconds <= 60
                  ? 'text-amber-800 font-medium'
                  : 'text-gray-700'
              "
            >
              {{
                timeRemainingSeconds <= 60
                  ? "Poco tiempo: completa tu pago pronto"
                  : "Tiempo para completar el pago"
              }}
            </span>
            <span
              class="font-mono font-bold"
              :class="
                timeRemainingSeconds <= 60 ? 'text-amber-700' : 'text-primary'
              "
            >
              {{ formatTimeRemaining(timeRemainingSeconds) }}
            </span>
          </div>

          <div class="space-y-3 mb-6">
            <div class="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{{ formatPrice(payableSubtotal) }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Tarifa de servicio (10%)</span>
              <span>{{ formatPrice(payableServiceFee) }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Envio</span>
              <span v-if="shippingCost" class="font-medium">
                {{ formatPrice(shippingPrice) }}
              </span>
              <span v-else class="text-gray-400 text-sm"
                >Selecciona direccion</span
              >
            </div>
            <div
              class="border-t border-gray-100 pt-3 flex justify-between text-lg font-black text-gray-900"
            >
              <span>Total</span>
              <span>{{ formatPrice(grandTotal) }}</span>
            </div>
          </div>

          <!-- Tiempo estimado de entrega -->
          <div
            v-if="shippingCost"
            class="mb-6 p-3 bg-primary/5 rounded-xl flex items-center gap-2 text-sm"
          >
            <svg
              class="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
            <span class="text-gray-700">
              Entrega estimada:
              <strong>{{ shippingCost.estimatedDays }}</strong>
            </span>
          </div>

          <!-- Error -->
          <div
            v-if="error"
            class="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm"
          >
            {{ error }}
          </div>

          <!-- Usuario no logueado -->
          <div
            v-if="!user"
            class="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-xl"
          >
            <p class="text-amber-800 text-sm mb-2">
              Debes iniciar sesion para continuar
            </p>
            <a
              href="/login"
              class="text-primary font-bold text-sm hover:underline"
              >Iniciar sesion</a
            >
          </div>

          <!-- Direccion no seleccionada -->
          <div
            v-else-if="!selectedAddress && items.length > 0"
            class="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-xl"
          >
            <p class="text-amber-800 text-sm">
              Selecciona una direccion de envio para continuar
            </p>
          </div>

          <!-- Todos los productos bloqueados -->
          <div
            v-else-if="items.length > 0 && payableItems.length === 0"
            class="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-xl"
          >
            <p class="text-amber-800 text-sm">
              Todos tus productos están siendo comprados por otros. Espera unos
              minutos o elimínalos de tu bolsa para continuar más tarde.
            </p>
          </div>

          <!-- Boton de pago -->
          <button
            type="button"
            @click="handleCheckout"
            :disabled="!canCheckout"
            class="w-full bg-[#009EE3] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#007EB5] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg
              v-if="isProcessing"
              class="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span v-if="isProcessing">Procesando...</span>
            <span v-else>Pagar con MercadoPago</span>
          </button>

          <!-- Info de seguridad -->
          <div
            class="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Pago seguro con MercadoPago</span>
          </div>

          <!-- Metodos de pago -->
          <div class="mt-6 pt-4 border-t border-gray-100">
            <p class="text-xs text-gray-400 text-center mb-3">
              Metodos de pago aceptados
            </p>
            <div class="flex justify-center gap-2 flex-wrap">
              <span class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                >Visa</span
              >
              <span class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                >Mastercard</span
              >
              <span class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                >Yape</span
              >
              <span class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                >PagoEfectivo</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: tiempo de pago agotado -->
    <Teleport to="body">
      <div
        v-if="showExpiryAlert"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <div class="text-center mb-6">
            <div
              class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                class="w-8 h-8 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">
              Tu tiempo se acabó
            </h3>
            <p class="text-gray-600 text-sm">
              No completaste el pago en 10 minutos. ¿Aún vas a pagar estos
              productos?
            </p>
          </div>
          <div class="flex flex-col gap-3">
            <button
              @click="handleExtendReservation"
              class="w-full bg-primary text-white py-3 rounded-xl font-bold hover:opacity-90"
            >
              Sí, dame más tiempo
            </button>
            <button
              @click="handleReleaseAndRedirect"
              class="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200"
            >
              No, liberar productos
            </button>
          </div>
          <p class="text-xs text-gray-400 text-center mt-4">
            Si no respondes en 30 segundos, los productos se liberarán
            automáticamente.
          </p>
        </div>
      </div>
    </Teleport>
  </div>
</template>
