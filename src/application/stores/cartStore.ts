import { reactive, computed, watch, onMounted } from 'vue';
import type { Product } from '../../domain/entities/Product';

interface CartItem extends Product {
  quantity: number;
}

const CART_STORAGE_KEY = 'naya_cart_items';

// El estado inicial SIEMPRE debe ser vacío para evitar desajustes de hidratación (Hydration Mismatch)
// entre el servidor (Astro) y el cliente (Vue).
const state = reactive({
  items: [] as CartItem[],
  isLoaded: false, // Flag para saber si ya cargamos desde localStorage
});

/**
 * Hook para usar el carrito con persistencia y seguridad de hidratación.
 */
export const useCart = () => {
  const items = computed(() => state.items);
  const isLoaded = computed(() => state.isLoaded);
  
  const totalItems = computed(() => 
    state.items.reduce((acc, item) => acc + item.quantity, 0)
  );

  const subtotal = computed(() =>
    state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  );

  // Tarifa de servicio (10% del subtotal)
  const serviceFee = computed(() => Math.round(subtotal.value * 0.10 * 100) / 100);

  // Total incluyendo tarifa de servicio
  const total = computed(() => subtotal.value + serviceFee.value);

  // Función para cargar los datos solo en el cliente
  const loadCart = () => {
    if (typeof window !== 'undefined' && !state.isLoaded) {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          state.items = parsed.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
          }));
        } catch (e) {
          console.error("Error cargando el carrito:", e);
        }
      }
      state.isLoaded = true;
    }
  };

  const addItem = (product: Product) => {
    const existing = state.items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      state.items.push({ ...product, quantity: 1 });
    }
  };

  const removeItem = (id: string) => {
    state.items = state.items.filter(i => i.id !== id);
  };

  const updateQuantity = (id: string, quantity: number) => {
    const item = state.items.find(i => i.id === id);
    if (item && quantity > 0) {
      item.quantity = quantity;
    }
  };

  const clearCart = () => {
    state.items = [];
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
    updateQuantity,
    clearCart
  };
};

// Persistencia: Solo observar si estamos en el cliente
if (typeof window !== 'undefined') {
  watch(
    () => state.items,
    (newItems) => {
      if (state.isLoaded) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
      }
    },
    { deep: true }
  );
}
