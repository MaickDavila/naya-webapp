import { reactive, computed } from "vue";
import { FirestoreUserRepository } from "../../infrastructure/repositories/FirestoreUserRepository";

const userRepository = new FirestoreUserRepository();

interface FavoritesState {
  favoriteIds: string[];
  loading: boolean;
  initialized: boolean;
}

const state = reactive<FavoritesState>({
  favoriteIds: [],
  loading: false,
  initialized: false,
});

// Promesa compartida para evitar llamadas concurrentes
let loadingPromise: Promise<void> | null = null;

export const useFavorites = () => {
  const favoriteIds = computed(() => state.favoriteIds);
  const count = computed(() => state.favoriteIds.length);
  const loading = computed(() => state.loading);
  const initialized = computed(() => state.initialized);

  const isFavorite = (productId: string): boolean => {
    return state.favoriteIds.includes(productId);
  };

  const loadFavorites = async (userId: string): Promise<void> => {
    // Si ya está inicializado, no hacer nada
    if (state.initialized) return;

    // Si ya hay una carga en progreso, esperar a que termine
    if (loadingPromise) {
      return loadingPromise;
    }

    state.loading = true;

    loadingPromise = (async () => {
      try {
        const userProfile = await userRepository.getById(userId);
        if (userProfile?.favoriteProductIds && Array.isArray(userProfile.favoriteProductIds)) {
          state.favoriteIds = [...userProfile.favoriteProductIds];
        } else {
          state.favoriteIds = [];
        }
        state.initialized = true;
      } catch (error) {
        console.error("Error loading favorites:", error);
        state.favoriteIds = [];
      } finally {
        state.loading = false;
        loadingPromise = null;
      }
    })();

    return loadingPromise;
  };

  const addFavorite = async (userId: string, productId: string): Promise<boolean> => {
    if (state.favoriteIds.includes(productId)) return true;

    // Optimistic update
    state.favoriteIds = [...state.favoriteIds, productId];

    try {
      await userRepository.update(userId, {
        favoriteProductIds: state.favoriteIds,
      });
      return true;
    } catch (error) {
      console.error("Error adding favorite:", error);
      // Revert on error
      state.favoriteIds = state.favoriteIds.filter((id) => id !== productId);
      return false;
    }
  };

  const removeFavorite = async (userId: string, productId: string): Promise<boolean> => {
    if (!state.favoriteIds.includes(productId)) return true;

    // Save current state for revert
    const previousIds = [...state.favoriteIds];

    // Optimistic update
    state.favoriteIds = state.favoriteIds.filter((id) => id !== productId);

    try {
      await userRepository.update(userId, {
        favoriteProductIds: state.favoriteIds,
      });
      return true;
    } catch (error) {
      console.error("Error removing favorite:", error);
      // Revert on error
      state.favoriteIds = previousIds;
      return false;
    }
  };

  const toggleFavorite = async (userId: string, productId: string): Promise<boolean> => {
    if (isFavorite(productId)) {
      return removeFavorite(userId, productId);
    } else {
      return addFavorite(userId, productId);
    }
  };

  const reset = (): void => {
    state.favoriteIds = [];
    state.initialized = false;
    state.loading = false;
    loadingPromise = null;
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
