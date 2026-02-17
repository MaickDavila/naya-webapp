import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../domain/constants/collections";

/**
 * Indica que un usuario tiene un producto en su bolsa (carrito).
 * Doc ID: productId_userId para unívoco.
 */
function getDocId(productId: string, userId: string) {
  return `${productId}_${userId}`;
}

/**
 * Servicio para rastrear qué productos tienen los usuarios en su bolsa.
 * Solo se usa cuando el usuario está logueado.
 */
export class ProductCartPresenceService {
  private getDocRef(productId: string, userId: string) {
    return doc(db, COLLECTIONS.PRODUCT_CART_PRESENCE, getDocId(productId, userId));
  }

  private getCollectionRef() {
    return collection(db, COLLECTIONS.PRODUCT_CART_PRESENCE);
  }

  async addPresence(productId: string, userId: string): Promise<void> {
    if (!productId || !userId) return;
    await setDoc(this.getDocRef(productId, userId), {
      productId,
      userId,
      updatedAt: Timestamp.now(),
    });
  }

  async removePresence(productId: string, userId: string): Promise<void> {
    if (!productId || !userId) return;
    await deleteDoc(this.getDocRef(productId, userId));
  }

  async removePresences(productIds: string[], userId: string): Promise<void> {
    if (productIds.length === 0 || !userId) return;
    await Promise.all(productIds.map((id) => this.removePresence(id, userId)));
  }

  /**
   * Al entrar a checkout, el producto deja de estar "en bolsa" y pasa a "reservado".
   */
  async removePresencesForCheckout(productIds: string[], userId: string): Promise<void> {
    return this.removePresences(productIds, userId);
  }

  /**
   * Suscripción: productIds que están en el carrito de OTROS (excluyendo los que están en checkout).
   */
  subscribeToInOthersCart(
    productIds: string[],
    currentUserId: string,
    getReservedByOthers: () => Set<string>,
    callback: (inCartIds: Set<string>) => void
  ): Unsubscribe {
    if (productIds.length === 0) {
      callback(new Set());
      return () => {};
    }

    const cached = new Map<string, boolean>();

    const checkProduct = async (productId: string) => {
      const q = query(
        this.getCollectionRef(),
        where("productId", "==", productId)
      );
      const snapshot = await getDocs(q);
      const otherHasIt = snapshot.docs.some(
        (d) => d.data().userId !== currentUserId
      );
      const reserved = getReservedByOthers();
      cached.set(productId, otherHasIt && !reserved.has(productId));
    };

    const notify = () => {
      const result = new Set<string>();
      cached.forEach((inCart, pid) => {
        if (inCart) result.add(pid);
      });
      callback(result);
    };

    const recheck = async () => {
      await Promise.all(productIds.map(checkProduct));
      notify();
    };

    const unsubs = productIds.map((pid) =>
      onSnapshot(
        query(this.getCollectionRef(), where("productId", "==", pid)),
        recheck
      )
    );

    recheck();
    return () => unsubs.forEach((u) => u());
  }
}

export const productCartPresenceService = new ProductCartPresenceService();
