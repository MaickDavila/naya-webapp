<script setup lang="ts">
import { onMounted } from 'vue';
import { useCart } from '../../application/stores/cartStore';

const { clearCart } = useCart();

onMounted(() => {
  // Escuchar evento para limpiar el carrito
  const handleClearCart = () => {
    clearCart();
  };
  
  window.addEventListener('clear-cart', handleClearCart);
  
  // Limpiar listener cuando el componente se desmonte
  return () => {
    window.removeEventListener('clear-cart', handleClearCart);
  };
});
</script>

<template>
  <!-- Componente invisible que solo maneja la lógica -->
</template>
