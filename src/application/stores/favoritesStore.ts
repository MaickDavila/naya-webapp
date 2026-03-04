import { reactive, computed, watch } from "vue";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { app } from "../../lib/firebase";
import { FirestoreUserRepository } from "../../infrastructure/repositories/FirestoreUserRepository";

const FAVORITES_STORAGE_KEY = "naya_favorite_ids";
const userRepository = new FirestoreUserRepository();

interface FavoritesState {
  favoriteIds: string[];
  loading: boolean;
  initialized: boolean;
  currentUserId: string | null;
}

const state = reactive<FavoritesState>({
  favoriteIds: [],
  loading: false,
  initialized: false,
  currentUserId: null,
});

const auth = getAuth(app);

function parseStoredFavorites(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id: unknown) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(state.favoriteIds));
}

async function loadFromFirestore(userId: string): Promise<string[]> {
  const userProfile = await userRepository.getById(userId);
  return userProfile?.favoriteProductIds && Array.isArray(userProfile.favoriteProductIds)
    ? [...userProfile.favoriteProductIds]
    : [];
}

async function handleAuthChange(userId: string | null, forceRefresh = false): Promise<void> {
  const prevUserId = state.currentUserId;
  if (!forceRefresh && prevUserId === userId && state.initialized) return;
  state.currentUserId = userId;

  if (userId) {
    const localIds =
      typeof window !== "undefined" ? parseStoredFavorites(localStorage.getItem(FAVORITES_STORAGE_KEY)) : [];

    // 1. Mostrar localStorage al instante
    state.favoriteIds = localIds;
    state.initialized = true;

    // 2. Traer backend; al llegar, reemplazar (backend es source of truth)
    // Incorporar ids que se añadieron localmente mientras esperábamos
    const remoteIds = await loadFromFirestore(userId);
    const localOnly = state.favoriteIds.filter((id) => !remoteIds.includes(id));
    state.favoriteIds = [...remoteIds, ...localOnly];
    saveToLocalStorage();
    if (localOnly.length > 0) {
      userRepository.update(userId, { favoriteProductIds: state.favoriteIds }).catch(() => {});
    }
  } else {
    // Usuario anónimo: cargar desde localStorage
    if (prevUserId && state.favoriteIds.length > 0) {
      saveToLocalStorage();
    }
    if (typeof window !== "undefined") {
      state.favoriteIds = parseStoredFavorites(localStorage.getItem(FAVORITES_STORAGE_KEY));
    } else {
      state.favoriteIds = [];
    }
    state.initialized = true;
  }
  state.loading = false;
}

// Suscripción a cambios de auth (solo en cliente)
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    handleAuthChange(user?.uid ?? null);
  });
}

export const useFavorites = () => {
  const favoriteIds = computed(() => state.favoriteIds);
  const count = computed(() => state.favoriteIds.length);
  const loading = computed(() => state.loading);
  const initialized = computed(() => state.initialized);

  const isFavorite = (productId: string): boolean => {
    return state.favoriteIds.includes(productId);
  };

  /**
   * Carga los favoritos. Si hay userId, muestra localStorage primero y luego reemplaza con backend.
   * Siempre refresca desde backend para sincronizar eliminaciones de otros dispositivos.
   */
  const loadFavorites = async (userId?: string | null): Promise<void> => {
    if (typeof window === "undefined") return;
    const uid = userId !== undefined ? userId : auth.currentUser?.uid ?? null;
    state.loading = true;
    await handleAuthChange(uid, true);
  };

  const addFavorite = async (userId: string, productId: string): Promise<boolean> => {
    if (state.favoriteIds.includes(productId)) return true;

    state.favoriteIds = [...state.favoriteIds, productId];
    saveToLocalStorage();

    userRepository.update(userId, { favoriteProductIds: state.favoriteIds }).catch((error) => {
      console.error("Error sincronizando favoritos:", error);
      state.favoriteIds = state.favoriteIds.filter((id) => id !== productId);
      saveToLocalStorage();
    });
    return true;
  };

  const removeFavorite = async (userId: string, productId: string): Promise<boolean> => {
    if (!state.favoriteIds.includes(productId)) return true;

    state.favoriteIds = state.favoriteIds.filter((id) => id !== productId);
    saveToLocalStorage();

    userRepository.update(userId, { favoriteProductIds: state.favoriteIds }).catch((error) => {
      console.error("Error sincronizando favoritos:", error);
      state.favoriteIds = [...state.favoriteIds, productId];
      saveToLocalStorage();
    });
    return true;
  };

  const toggleFavorite = async (userId: string, productId: string): Promise<boolean> => {
    if (state.favoriteIds.includes(productId)) {
      return removeFavorite(userId, productId);
    } else {
      return addFavorite(userId, productId);
    }
  };

  const reset = (): void => {
    state.favoriteIds = [];
    state.initialized = false;
    state.loading = false;
    state.currentUserId = null;
  };

  return {
    favoriteIds,
    count,
    loading,
    initialized,
    isFavorite,
    loadFavorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    reset,
  };
};

// Persistir a localStorage cuando cambien los favoritos
if (typeof window !== "undefined") {
  watch(
    () => state.favoriteIds,
    () => {
      if (state.initialized) saveToLocalStorage();
    },
    { deep: true }
  );
}
