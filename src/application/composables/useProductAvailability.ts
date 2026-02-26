import { ref, watch, type Ref } from "vue";
import { productReservationService } from "../../infrastructure/services/ProductReservationService";
import { productCartPresenceService } from "../../infrastructure/services/ProductCartPresenceService";

export type ProductAvailabilityState = {
  /** Productos en checkout por otros: NO se puede comprar */
  inCheckoutByOthers: Ref<Set<string>>;
  /** Productos en bolsa de otros: mensaje informativo, sí se puede comprar */
  inCartByOthers: Ref<Set<string>>;
  unsubscribe: () => void;
};

/**
 * Composable que expone el estado de disponibilidad de productos.
 * - inCheckoutByOthers: bloqueados, no se puede agregar al carrito ni comprar
 * - inCartByOthers: mensaje informativo, se puede comprar
 */
export function useProductAvailability(
  productIds: Ref<string[]>,
  currentUserId: Ref<string | undefined>
): ProductAvailabilityState {
  const inCheckoutByOthers = ref<Set<string>>(new Set());
  const inCartByOthers = ref<Set<string>>(new Set());

  let unsubReservations: (() => void) | null = null;
  let unsubCartPresence: (() => void) | null = null;

  const setup = () => {
    unsubReservations?.();
    unsubCartPresence?.();

    const ids = productIds.value;
    const uid = currentUserId.value ?? "";

    if (ids.length === 0) {
      inCheckoutByOthers.value = new Set();
      inCartByOthers.value = new Set();
      return;
    }

    unsubReservations = productReservationService.subscribeToReservedByOthers(
      ids,
      uid,
      (reserved) => {
        inCheckoutByOthers.value = reserved;
      }
    );

    unsubCartPresence = productCartPresenceService.subscribeToInOthersCart(
      ids,
      uid,
      () => inCheckoutByOthers.value,
      (inCart) => {
        inCartByOthers.value = inCart;
      }
    );
  };

  watch([productIds, currentUserId], setup, { immediate: true });

  return {
    inCheckoutByOthers,
    inCartByOthers,
    unsubscribe: () => {
      unsubReservations?.();
      unsubCartPresence?.();
    },
  };
}
