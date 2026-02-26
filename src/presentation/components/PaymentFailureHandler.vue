<script setup lang="ts">
import { onMounted } from "vue";
import { useCart } from "../../application/stores/cartStore";
import { useAuth } from "../../application/stores/authStore";
import { productReservationService } from "../../infrastructure/services/ProductReservationService";
import { productCartPresenceService } from "../../infrastructure/services/ProductCartPresenceService";

const EXPIRES_AT_KEY = "naya_checkout_expires_at";

const { loadCart, items } = useCart();
const { user, initAuth } = useAuth();

/**
 * Cuando el pago falla, liberamos las reservas para que el producto
 * vuelva a mostrarse disponible para otros. También restauramos la
 * presencia en la bolsa (el usuario sigue teniendo los items).
 */
onMounted(async () => {
  await initAuth();
  await loadCart(user.value?.uid ?? undefined);

  if (typeof window === "undefined") return;

  if (items.value.length > 0 && user.value) {
    const productIds = items.value.map((item) => item.id);
    await productReservationService.releaseReservations(productIds, user.value.uid);
    await Promise.all(
      productIds.map((id) =>
        productCartPresenceService.addPresence(id, user.value!.uid)
      )
    );
  }

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(EXPIRES_AT_KEY);
  }
});
</script>

<template>
  <!-- Componente invisible -->
</template>
