import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../domain/constants/collections";

const VIEWER_ID_KEY = "naya_viewer_id";

function getDocId(productId: string, viewerId: string) {
  return `${productId}_${viewerId}`;
}

function getOrCreateViewerId(): string {
  if (typeof sessionStorage === "undefined") return "";
  let id = sessionStorage.getItem(VIEWER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(VIEWER_ID_KEY, id);
  }
  return id;
}

/**
 * Servicio para rastrear cuántas personas están viendo un producto en su detalle.
 * Se suma al entrar y se resta al salir de la página.
 */
export class ProductViewersService {
  private getDocRef(productId: string, viewerId: string) {
    return doc(db, COLLECTIONS.PRODUCT_VIEWERS, getDocId(productId, viewerId));
  }

  private getCollectionRef() {
    return collection(db, COLLECTIONS.PRODUCT_VIEWERS);
  }

  /**
   * Registra que un usuario/sesión está viendo el producto.
   */
  async addViewer(productId: string, viewerId?: string): Promise<void> {
    if (!productId) return;
    const id = viewerId || getOrCreateViewerId();
    if (!id) return;
    await setDoc(this.getDocRef(productId, id), {
      productId,
      viewerId: id,
      lastSeen: Timestamp.now(),
    });
  }

  /**
   * Quita al usuario/sesión de la lista de espectadores.
   */
  async removeViewer(productId: string, viewerId?: string): Promise<void> {
    if (!productId) return;
    const id = viewerId || getOrCreateViewerId();
    if (!id) return;
    await deleteDoc(this.getDocRef(productId, id));
  }

  /**
   * Suscripción en tiempo real al número de espectadores de un producto.
   */
  subscribeToViewerCount(
    productId: string,
    callback: (count: number) => void
  ): Unsubscribe {
    if (!productId) {
      callback(0);
      return () => {};
    }

    const q = query(
      this.getCollectionRef(),
      where("productId", "==", productId)
    );

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    });
  }
}

export const productViewersService = new ProductViewersService();
