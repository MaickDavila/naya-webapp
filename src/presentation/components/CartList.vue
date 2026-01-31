<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useCart } from '../../application/stores/cartStore';
import { useAuth } from '../../application/stores/authStore';
import { formatPrice } from '../utils/formatters';

const { items, subtotal, serviceFee, total, removeItem, updateQuantity, loadCart, isLoaded } = useCart();
const { user, initAuth } = useAuth();

onMounted(() => {
  initAuth();
  loadCart();
});

// Función para ir a checkout
const goToCheckout = () => {
  if (items.value.length === 0) {
    return;
  }

  // Si no está autenticado, redirigir a login con redirect
  if (!user.value) {
    window.location.href = '/login?next=' + encodeURIComponent('/checkout');
    return;
  }

  // Redirigir a checkout
  window.location.href = '/checkout';
};

// Verificar si puede ir a checkout
const canGoToCheckout = computed(() => {
  return items.value.length > 0;
});
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Estado de Carga / Vacío Inicial (Para coincidir con el SSR de Astro) -->
    <div v-if="!isLoaded || items.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-24 h-24 bg-background-secondary rounded-full flex items-center justify-center mb-6">
        <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <h2 class="text-2xl font-black text-gray-900 mb-2">
        {{ !isLoaded ? 'Cargando bolsa...' : 'Tu bolsa está vacía' }}
      </h2>
      <p class="text-gray-500 mb-8">
        {{ !isLoaded ? 'Estamos recuperando tus tesoros.' : 'Parece que aún no has encontrado ningún tesoro.' }}
      </p>
      <a v-if="isLoaded" href="/" class="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary-dark transition-all">
        Explorar productos
      </a>
    </div>

    <!-- Lista de Productos (Solo se renderiza en el cliente después de cargar) -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in duration-500">
      <!-- Lista de Productos -->
      <div class="lg:col-span-2 flex flex-col gap-6">
        <div v-for="item in items" :key="item.id" class="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 bg-white rounded-[2rem] shadow-sm border border-black/5">
          <!-- Imagen: tamaño fijo en desktop, auto en móvil para evitar desborde -->
          <div class="w-full sm:w-32 h-48 sm:h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
            <img :src="item.images[0]" :alt="item.title" class="w-full h-full object-cover" />
          </div>
          
          <div class="flex flex-col justify-between flex-1 py-1">
            <div class="flex justify-between items-start gap-4">
              <div class="min-w-0">
                <h3 class="font-bold text-gray-900 text-lg leading-tight mb-1 truncate sm:whitespace-normal">{{ item.title }}</h3>
                <p class="text-xs text-gray-400 uppercase tracking-widest">{{ item.category }}</p>
              </div>
              <button @click="removeItem(item.id)" class="text-gray-300 hover:text-error transition-colors p-1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div class="flex flex-wrap justify-between items-end gap-4 mt-4 sm:mt-0">
              <div class="flex items-center bg-background-secondary rounded-full px-4 py-1.5 gap-4">
                <button @click="updateQuantity(item.id, item.quantity - 1)" class="text-gray-600 font-bold p-1">-</button>
                <span class="text-sm font-black w-4 text-center">{{ item.quantity }}</span>
                <button @click="updateQuantity(item.id, item.quantity + 1)" class="text-gray-600 font-bold p-1">+</button>
              </div>
              <span class="font-black text-primary text-xl whitespace-nowrap">{{ formatPrice(item.price * item.quantity) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen del Pedido -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 sticky top-32">
          <h3 class="text-xl font-black text-gray-900 mb-8">Resumen</h3>
          
          <div class="flex flex-col gap-4 mb-8">
            <div class="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span class="font-bold text-gray-900">{{ formatPrice(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-gray-500">
              <span>Tarifa de servicio (10%)</span>
              <span class="font-bold text-gray-900">{{ formatPrice(serviceFee) }}</span>
            </div>
            <div class="flex justify-between text-gray-500">
              <span>Envio</span>
              <span class="text-success font-bold">Gratis</span>
            </div>
          </div>

          <div class="border-t border-black/5 pt-6 mb-8 flex justify-between items-end">
            <span class="font-bold text-gray-900">Total</span>
            <span class="text-3xl font-black text-primary leading-none">{{ formatPrice(total) }}</span>
          </div>
          
          <button
            type="button"
            @click="goToCheckout"
            :disabled="!canGoToCheckout"
            class="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Finalizar Compra
          </button>
          
          <div class="mt-6 flex items-center justify-center gap-2 text-gray-400 text-xs uppercase tracking-widest font-bold">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Pago Seguro
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
