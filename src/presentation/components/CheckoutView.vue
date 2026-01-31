<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useCart } from "../../application/stores/cartStore";
import { useAuth } from "../../application/stores/authStore";
import { useShipping } from "../../application/stores/shippingStore";
import { paymentService } from "../../infrastructure/services/PaymentService";
import { formatPrice } from "../utils/formatters";
import type { CheckoutItem } from "../../domain/entities/Transaction";
import AddressSelector from "./shipping/AddressSelector.vue";

const { items, subtotal, serviceFee, total, clearCart, loadCart } = useCart();
const { user, initAuth } = useAuth();
const { selectedAddress, shippingCost, loadAddresses } = useShipping();

const isProcessing = ref(false);
const error = ref<string | null>(null);

// Costo de envio (0 si no hay direccion seleccionada)
const shippingPrice = computed(() => shippingCost.value?.price || 0);

// Total final incluyendo envio
const grandTotal = computed(() => total.value + shippingPrice.value);

// Verificar si puede proceder al pago
const canCheckout = computed(() => {
  return (
    items.value.length > 0 &&
    user.value &&
    selectedAddress.value &&
    !isProcessing.value
  );
});

/**
 * Procesar pago con MercadoPago
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

  if (items.value.length === 0) {
    error.value = "Tu carrito esta vacio";
    return;
  }

  if (!selectedAddress.value) {
    error.value = "Debes seleccionar una direccion de envio";
    return;
  }

  isProcessing.value = true;
  error.value = null;

  try {
    // Convertir items del carrito a formato de checkout
    const checkoutItems: CheckoutItem[] = items.value.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      quantity: item.quantity,
      imageUrl: item.images?.[0],
      sellerId: item.sellerId,
      sellerName: item.sellerName,
    }));

    // Crear preferencia de pago
    const preference = await paymentService.createPreference(checkoutItems, {
      id: user.value.uid,
      name: user.value.displayName || "Usuario",
      email: user.value.email || "",
    });

    if (!preference.initPoint) {
      throw new Error("No se recibio una URL de pago valida");
    }

    paymentService.redirectToPayment(preference.initPoint);
  } catch (err: any) {
    console.error("Error al procesar pago:", err);
    error.value = err.message || "Error al procesar el pago. Intenta de nuevo.";
    isProcessing.value = false;
  }
};

onMounted(async () => {
  await initAuth();
  loadCart();
  if (user.value) {
    await loadAddresses(user.value.uid);
  }
});
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Columna izquierda: Productos y Direccion -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Lista de productos -->
        <div class="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-black/5">
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
            <a href="/" class="text-primary font-bold hover:underline">Explorar productos</a>
          </div>

          <!-- Items del carrito -->
          <div v-else class="space-y-4">
            <div
              v-for="item in items"
              :key="item.id"
              class="flex gap-4 p-4 bg-gray-50 rounded-2xl"
            >
              <div class="w-20 h-20 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                <img
                  v-if="item.images?.[0]"
                  :src="item.images[0]"
                  :alt="item.title"
                  class="w-full h-full object-cover"
                />
              </div>

              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-gray-900 truncate">{{ item.title }}</h3>
                <p class="text-sm text-gray-500">Vendido por {{ item.sellerName }}</p>
                <p class="text-sm text-gray-400">Cantidad: {{ item.quantity }}</p>
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

          <div class="space-y-3 mb-6">
            <div class="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{{ formatPrice(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Tarifa de servicio (10%)</span>
              <span>{{ formatPrice(serviceFee) }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Envio</span>
              <span v-if="shippingCost" class="font-medium">
                {{ formatPrice(shippingPrice) }}
              </span>
              <span v-else class="text-gray-400 text-sm">Selecciona direccion</span>
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
            <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
            <span class="text-gray-700">
              Entrega estimada: <strong>{{ shippingCost.estimatedDays }}</strong>
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
          <div v-if="!user" class="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <p class="text-amber-800 text-sm mb-2">Debes iniciar sesion para continuar</p>
            <a href="/login" class="text-primary font-bold text-sm hover:underline"
              >Iniciar sesion</a
            >
          </div>

          <!-- Direccion no seleccionada -->
          <div
            v-else-if="!selectedAddress && items.length > 0"
            class="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-xl"
          >
            <p class="text-amber-800 text-sm">Selecciona una direccion de envio para continuar</p>
          </div>

          <!-- Boton de pago -->
          <button
            type="button"
            @click="handleCheckout"
            :disabled="!canCheckout"
            class="w-full bg-[#009EE3] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#007EB5] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg v-if="isProcessing" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
          <div class="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <p class="text-xs text-gray-400 text-center mb-3">Metodos de pago aceptados</p>
            <div class="flex justify-center gap-2 flex-wrap">
              <span class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">Visa</span>
              <span class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">Mastercard</span>
              <span class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">Yape</span>
              <span class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">PagoEfectivo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
