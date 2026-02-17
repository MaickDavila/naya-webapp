<script setup lang="ts">
import { onMounted } from "vue";
import { useCart } from "../../application/stores/cartStore";
import { useAuth } from "../../application/stores/authStore";
import { productReservationService } from "../../infrastructure/services/ProductReservationService";
import { productCartPresenceService } from "../../infrastructure/services/ProductCartPresenceService";

const CART_STORAGE_KEY = "naya_cart_items";
const EXPIRES_AT_KEY = "naya_checkout_expires_at";

const { loadCart } = useCart();
const { user, initAuth } = useAuth();

/**
 * Cuando el pago falla, liberamos las reservas para que el producto
 * vuelva a mostrarse disponible para otros. También restauramos la
 * presencia en la bolsa (el usuario sigue teniendo los items).
 */
onMounted(async () => {
  await initAuth();

  if (typeof localStorage === "undefined") return;

  const saved = localStorage.getItem(CART_STORAGE_KEY);
  if (saved && user.value) {
    try {
      const parsed = JSON.parse(saved);
      const productIds = parsed.map((item: { id: string }) => item.id).filter(Boolean);
      if (productIds.length > 0) {
        await productReservationService.releaseReservations(productIds, user.value.uid);
        await Promise.all(
          productIds.map((id: string) =>
            productCartPresenceService.addPresence(id, user.value!.uid)
          )
        );
      }
    } catch {
      // Ignorar errores de parseo
    }
  }

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(EXPIRES_AT_KEY);
  }

  loadCart();
});
</script>

<template>
  <!-- Componente invisible -->
</template>
