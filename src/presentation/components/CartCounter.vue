<script setup lang="ts">
import { onMounted } from 'vue';
import { useCart } from '../../application/stores/cartStore';

const { totalItems, loadCart, isLoaded } = useCart();

// Cargamos el carrito solo cuando el componente se monta en el cliente
onMounted(() => {
  loadCart();
});
</script>

<template>
  <a href="/cart" class="p-2 hover:bg-black/5 rounded-full transition-colors relative group">
    <svg class="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
    <!-- Solo mostramos el contador si ya cargamos los datos del cliente y hay items -->
    <span 
      v-if="isLoaded && totalItems > 0"
      class="absolute top-1 right-1 bg-primary text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#D9D2C8] shadow-sm animate-in fade-in zoom-in duration-300"
    >
      {{ totalItems }}
    </span>
  </a>
</template>
