import { reactive, computed, watch } from "vue";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { app } from "../../lib/firebase";
import type { Product } from "../../domain/entities/Product";
import type { CartItem } from "../../domain/repositories/CartRepository";
import { FirestoreCartRepository } from "../../infrastructure/repositories/FirestoreCartRepository";
import { CartItemMapper } from "../../infrastructure/mappers/CartItemMapper";

const CART_STORAGE_KEY = "naya_cart_items";

const cartRepository = new FirestoreCartRepository();

// Estado inicial vacío para evitar Hydration Mismatch
const state = reactive({
  items: [] as CartItem[],
  isLoaded: false,
  currentUserId: null as string | null,
  isSyncingFromRemote: false, // Evita bucles al cargar desde Firestore
});

const auth = getAuth(app);

function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    return parsed.map((item: Record<string, unknown>) => ({
      ...item,
      createdAt: item.createdAt ? new Date(item.createdAt as string) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt as string) : new Date(),
      quantity: (item.quantity as number) ?? 1,
    })) as CartItem[];
  } catch {
    return [];
  }
}

async function loadFromFirestore(userId: string): Promise<void> {
  state.isSyncingFromRemote = true;
  try {
    const items = await cartRepository.getCart(userId);
    state.items = items;
  } finally {
    state.isSyncingFromRemote = false;
  }
}

function loadFromLocalStorage(): void {
  state.isSyncingFromRemote = true;
  try {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      state.items = parseStoredCart(saved);
    } else {
      state.items = [];
    }
  } finally {
    state.isSyncingFromRemote = false;
  }
}


async function syncToFirestore(userId: string): Promise<void> {
  if (state.items.length === 0) {
    await cartRepository.clearCart(userId);
    return;
  }
  const data = state.items.map((item) => ({
    ...CartItemMapper.toPersistence(item),
    productId: item.id,
    quantity: item.quantity,
  }));
  await cartRepository.setCart(userId, data);
}

function saveToLocalStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
}

async function handleAuthChange(userId: string | null, forceRefresh = false): Promise<void> {
  const prevUserId = state.currentUserId;
  if (!forceRefresh && prevUserId === userId && state.isLoaded) return;
  state.currentUserId = userId;

  if (userId) {
    const localItems =
      typeof window !== "undefined" ? parseStoredCart(localStorage.getItem(CART_STORAGE_KEY)) : [];

    // 1. Mostrar localStorage al instante (siempre prioridad a lo que el usuario tiene localmente)
    state.items = localItems;
    state.isLoaded = true;

    // 2. Traer backend; al llegar, reemplazar TODO con el backend (source of truth) y actualizar localStorage
    const remoteItems = await cartRepository.getCart(userId);
    state.items = remoteItems;
    saveToLocalStorage();
  } else {
    // Usuario anónimo: cargar desde localStorage (síncrono)
    if (prevUserId && state.items.length > 0) {
      saveToLocalStorage();
    }
    loadFromLocalStorage();
    state.isLoaded = true;
  }
}

// Suscripción a cambios de auth (solo en cliente)
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    handleAuthChange(user?.uid ?? null);
  });
}

export const useCart = () => {
  const items = computed(() => state.items);
  const isLoaded = computed(() => state.isLoaded);

  const totalItems = computed(() =>
    state.items.reduce((acc, item) => acc + item.quantity, 0)
  );

  const subtotal = computed(() =>
    state.items.reduce((acc, item) => acc + item.price * item.quantity, 0)
  );

  const serviceFee = computed(() =>
    Math.round(subtotal.value * 0.1 * 100) / 100
  );

  const total = computed(() => subtotal.value + serviceFee.value);

  /**
   * Carga el carrito. Si se pasa userId (p. ej. tras initAuth), carga para ese usuario.
   * Si no se pasa, usa el usuario actual de Firebase si hay sesión.
   */
  const loadCart = async (userId?: string | null) => {
    if (typeof window === "undefined") return;
    const uid = userId !== undefined ? userId : auth.currentUser?.uid ?? null;
    await handleAuthChange(uid, true); // Siempre refrescar para traer eliminaciones de otros dispositivos
  };

  const addItem = (product: Product) => {
    const existing = state.items.find((i) => i.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      state.items.push({ ...product, quantity: 1 });
    }
    saveToLocalStorage(); // Siempre guardar local primero
    if (state.currentUserId) {
      const item = state.items.find((i) => i.id === product.id)!;
      cartRepository.setItem(state.currentUserId, CartItemMapper.toPersistence(item)).catch((e) =>
        console.error("Error sincronizando carrito:", e)
      );
    }
  };

  const removeItem = (id: string) => {
    state.items = state.items.filter((i) => i.id !== id);
    saveToLocalStorage();
    if (state.currentUserId) {
      cartRepository.removeItem(state.currentUserId, id).catch((e) =>
        console.error("Error sincronizando carrito:", e)
      );
    }
  };

  const removeItems = (ids: string[]) => {
    const idSet = new Set(ids);
    state.items = state.items.filter((i) => !idSet.has(i.id));
    saveToLocalStorage();
    if (state.currentUserId) {
      Promise.all(ids.map((id) => cartRepository.removeItem(state.currentUserId!, id))).catch((e) =>
        console.error("Error sincronizando carrito:", e)
      );
    }
  };

  const updateQuantity = (id: string, quantity: number) => {
    const item = state.items.find((i) => i.id === id);
    if (item && quantity > 0) {
      item.quantity = quantity;
      saveToLocalStorage();
      if (state.currentUserId) {
        cartRepository.setItem(state.currentUserId, CartItemMapper.toPersistence(item)).catch((e) =>
          console.error("Error sincronizando carrito:", e)
        );
      }
    }
  };

  const clearCart = () => {
    state.items = [];
    if (state.currentUserId) {
      cartRepository.clearCart(state.currentUserId).catch((e) =>
        console.error("Error sincronizando carrito:", e)
      );
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  };

  return {
    items,
    isLoaded,
    totalItems,
    subtotal,
    serviceFee,
    total,
    loadCart,
    addItem,
    removeItem,
    removeItems,
    updateQuantity,
    clearCart,
  };
};

// Persistir a localStorage siempre que cambien los items (localStorage es nuestra cache)
if (typeof window !== "undefined") {
  watch(
    () => state.items,
    () => {
      if (state.isLoaded) saveToLocalStorage();
    },
    { deep: true }
  );
}
