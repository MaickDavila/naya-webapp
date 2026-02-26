import type { Product } from "../entities/Product";

/** Item del carrito: producto + cantidad */
export type CartItem = Product & { quantity: number };

/** Datos para persistir (productId + quantity + snapshot del producto) */
export interface CartItemData {
  productId: string;
  quantity: number;
  [key: string]: unknown;
}

export interface CartRepository {
  /** Obtiene todos los items del carrito del usuario */
  getCart(userId: string): Promise<CartItem[]>;

  /** Guarda o actualiza un item en el carrito */
  setItem(userId: string, item: CartItemData): Promise<void>;

  /** Elimina un item del carrito */
  removeItem(userId: string, productId: string): Promise<void>;

  /** Reemplaza todo el carrito */
  setCart(userId: string, items: CartItemData[]): Promise<void>;

  /** Elimina todo el carrito del usuario */
  clearCart(userId: string): Promise<void>;
}
