<script setup lang="ts">
import { onMounted } from "vue";
import { useCart } from "../../application/stores/cartStore";
import { useAuth } from "../../application/stores/authStore";
import { productReservationService } from "../../infrastructure/services/ProductReservationService";
import { productCartPresenceService } from "../../infrastructure/services/ProductCartPresenceService";

const CART_STORAGE_KEY = "naya_cart_items";
const PAID_ITEMS_KEY = "naya_paid_product_ids";
const EXPIRES_AT_KEY = "naya_checkout_expires_at";

const { clearCart, removeItems, loadCart } = useCart();
const { user, initAuth } = useAuth();

onMounted(async () => {
  await initAuth();

  if (typeof localStorage === "undefined") return;

  loadCart();

  let productIdsToProcess: string[] = [];

  const paidIdsRaw = typeof sessionStorage !== "undefined"
    ? sessionStorage.getItem(PAID_ITEMS_KEY)
    : null;
  if (paidIdsRaw) {
    try {
      const paidIds = JSON.parse(paidIdsRaw) as string[];
      productIdsToProcess = paidIds.filter(Boolean);
    } catch {
      // Fallback: usar todo el carrito
    }
  }

  if (productIdsToProcess.length === 0) {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        const items = JSON.parse(saved);
        productIdsToProcess = items.map((item: { id: string }) => item.id).filter(Boolean);
      } catch {
        // Ignorar
      }
    }
  }

  if (productIdsToProcess.length > 0 && user.value) {
    await productReservationService.releaseReservations(productIdsToProcess, user.value.uid);
    await productCartPresenceService.removePresences(productIdsToProcess, user.value.uid);
  }

  if (productIdsToProcess.length > 0) {
    removeItems(productIdsToProcess);
  } else {
    clearCart();
  }

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(PAID_ITEMS_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
  }
  window.dispatchEvent(new CustomEvent("clear-cart"));
});
</script>

<template>
  <!-- Componente invisible -->
</template>
