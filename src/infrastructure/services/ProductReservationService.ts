import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../domain/constants/collections";
import type { ProductReservation } from "../../domain/entities/ProductReservation";

const RESERVATION_DURATION_MS = 10 * 60 * 1000; // 10 minutos
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos

/**
 * Servicio para gestionar reservas temporales de productos en checkout.
 * Cuando un usuario entra a checkout, sus productos se reservan por 10 minutos.
 * Otros usuarios ven esos productos en gris en su carrito.
 */
export class ProductReservationService {
  private getDocRef(productId: string) {
    return doc(db, COLLECTIONS.PRODUCT_RESERVATIONS, productId);
  }

  /**
   * Reserva productos para un usuario que está en checkout.
   */
  async reserveProducts(productIds: string[], userId: string): Promise<void> {
    if (productIds.length === 0 || !userId) return;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESERVATION_DURATION_MS);

    await Promise.all(
      productIds.map((productId) => {
        const data = {
          productId,
          userId,
          expiresAt: Timestamp.fromDate(expiresAt),
          updatedAt: Timestamp.fromDate(now),
        };
        return setDoc(this.getDocRef(productId), data);
      })
    );
  }

  /**
   * Extiende las reservas (heartbeat).
   */
  async extendReservations(productIds: string[], userId: string): Promise<void> {
    if (productIds.length === 0 || !userId) return;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESERVATION_DURATION_MS);

    await Promise.all(
      productIds.map(async (productId) => {
        const snapshot = await getDoc(this.getDocRef(productId));
        if (snapshot.exists() && snapshot.data()?.userId === userId) {
          return setDoc(this.getDocRef(productId), {
            productId,
            userId,
            expiresAt: Timestamp.fromDate(expiresAt),
            updatedAt: Timestamp.fromDate(now),
          });
        }
      })
    );
  }

  /**
   * Libera las reservas de un usuario.
   */
  async releaseReservations(productIds: string[], userId: string): Promise<void> {
    if (productIds.length === 0 || !userId) return;

    await Promise.all(
      productIds.map(async (productId) => {
        const snapshot = await getDoc(this.getDocRef(productId));
        if (snapshot.exists() && snapshot.data()?.userId === userId) {
          return deleteDoc(this.getDocRef(productId));
        }
      })
    );
  }

  /**
   * Suscripción en tiempo real: retorna Set de productIds reservados por otros.
   */
  subscribeToReservedByOthers(
    productIds: string[],
    currentUserId: string,
    callback: (reservedIds: Set<string>) => void
  ): Unsubscribe {
    if (productIds.length === 0) {
      callback(new Set());
      return () => {};
    }

    const cached = new Map<string, boolean>();
    const notify = () => {
      const reserved = new Set<string>();
      cached.forEach((isReserved, pid) => {
        if (isReserved) reserved.add(pid);
      });
      callback(reserved);
    };

    const unsubscribes = productIds.map((productId) =>
      onSnapshot(this.getDocRef(productId), (snapshot) => {
        const now = Timestamp.now();
        if (snapshot.exists()) {
          const data = snapshot.data();
          const expiresAt = data.expiresAt as Timestamp;
          const isValid = expiresAt?.toMillis() > now.toMillis();
          const isOthers = data.userId !== currentUserId;
          cached.set(productId, isValid && isOthers);
        } else {
          cached.set(productId, false);
        }
        notify();
      })
    );

    return () => unsubscribes.forEach((u) => u());
  }

  /** Duración de la reserva en ms (para el heartbeat) */
  getHeartbeatInterval(): number {
    return HEARTBEAT_INTERVAL_MS;
  }
}

export const productReservationService = new ProductReservationService();
