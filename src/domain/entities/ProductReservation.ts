import type { Timestamp } from "firebase/firestore";

/**
 * Reserva temporal de un producto cuando un usuario está en checkout.
 * Duración: 10 minutos. Se extiende con heartbeat mientras el usuario permanece en checkout.
 */
export interface ProductReservation {
  productId: string;
  userId: string;
  expiresAt: Timestamp;
  updatedAt: Timestamp;
}
