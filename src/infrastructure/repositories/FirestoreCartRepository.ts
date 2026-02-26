import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../domain/constants/collections";
import type {
  CartRepository,
  CartItemData,
  CartItem,
} from "../../domain/repositories/CartRepository";
import { CartItemMapper } from "../mappers/CartItemMapper";

/**
 * Carrito en Firestore: subcolección users/{userId}/cart/{productId}
 * Cada documento es un item del carrito (producto + cantidad).
 */
export class FirestoreCartRepository implements CartRepository {
  private getCartRef(userId: string) {
    return collection(db, COLLECTIONS.USERS, userId, "cart");
  }

  private getItemRef(userId: string, productId: string) {
    return doc(db, COLLECTIONS.USERS, userId, "cart", productId);
  }

  async getCart(userId: string): Promise<CartItem[]> {
    if (!userId) return [];
    const snap = await getDocs(this.getCartRef(userId));
    return snap.docs.map((d) =>
      CartItemMapper.toDomain(d.id, d.data() as Record<string, unknown>)
    );
  }

  async setItem(userId: string, item: CartItemData): Promise<void> {
    if (!userId || !item.productId) return;
    const productId = item.productId;
    const data = {
      ...item,
      updatedAt: Timestamp.now(),
    };
    await setDoc(this.getItemRef(userId, productId), data);
  }

  async removeItem(userId: string, productId: string): Promise<void> {
    if (!userId || !productId) return;
    await deleteDoc(this.getItemRef(userId, productId));
  }

  async setCart(userId: string, items: CartItemData[]): Promise<void> {
    if (!userId) return;
    const batch = writeBatch(db);
    const cartRef = this.getCartRef(userId);
    const existing = await getDocs(cartRef);
    existing.docs.forEach((d) => batch.delete(d.ref));
    const now = Timestamp.now();
    items.forEach((item) => {
      const productId = item.productId || (item as { id?: string }).id;
      if (productId) {
        const ref = doc(cartRef, productId);
        batch.set(ref, { ...item, productId, updatedAt: now });
      }
    });
    await batch.commit();
  }

  async clearCart(userId: string): Promise<void> {
    if (!userId) return;
    const snap = await getDocs(this.getCartRef(userId));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
