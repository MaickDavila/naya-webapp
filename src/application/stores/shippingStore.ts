import { reactive, computed } from "vue";
import type { UserShippingAddress, ShippingRate } from "../../domain/entities/ShippingAddress";
import { calculateShippingCost } from "../../domain/entities/ShippingAddress";
import { FirestoreUserRepository } from "../../infrastructure/repositories/FirestoreUserRepository";

const userRepository = new FirestoreUserRepository();

interface ShippingState {
  addresses: UserShippingAddress[];
  selectedAddressId: string | null;
  loading: boolean;
  initialized: boolean;
  currentUserId: string | null;
}

const state = reactive<ShippingState>({
  addresses: [],
  selectedAddressId: null,
  loading: false,
  initialized: false,
  currentUserId: null,
});

// Shared promise to avoid concurrent loads
let loadingPromise: Promise<void> | null = null;

export const useShipping = () => {
  const addresses = computed(() => state.addresses);
  const loading = computed(() => state.loading);
  const initialized = computed(() => state.initialized);

  const selectedAddress = computed(() => {
    if (!state.selectedAddressId) {
      // Return default address if no selection
      return state.addresses.find((addr) => addr.isDefault) || state.addresses[0] || null;
    }
    return state.addresses.find((addr) => addr.id === state.selectedAddressId) || null;
  });

  const shippingCost = computed((): ShippingRate | null => {
    const addr = selectedAddress.value;
    if (!addr) return null;
    return calculateShippingCost(addr);
  });

  const loadAddresses = async (userId: string): Promise<void> => {
    // Si cambió de usuario, resetear estado antes de cargar
    if (state.currentUserId !== null && state.currentUserId !== userId) {
      state.addresses = [];
      state.selectedAddressId = null;
      state.initialized = false;
      state.currentUserId = null;
      loadingPromise = null;
    }
    if (state.initialized && state.currentUserId === userId) return;
    if (loadingPromise) return loadingPromise;

    state.loading = true;
    state.currentUserId = userId;

    loadingPromise = (async () => {
      try {
        const userProfile = await userRepository.getById(userId);
        if (userProfile?.shippingAddresses && Array.isArray(userProfile.shippingAddresses)) {
          state.addresses = [...userProfile.shippingAddresses];
        } else {
          state.addresses = [];
        }
        state.initialized = true;
      } catch (error) {
        console.error("Error loading shipping addresses:", error);
        state.addresses = [];
      } finally {
        state.loading = false;
        loadingPromise = null;
      }
    })();

    return loadingPromise;
  };

  const addAddress = async (userId: string, address: Omit<UserShippingAddress, "id" | "createdAt">): Promise<boolean> => {
    const newAddress: UserShippingAddress = {
      ...address,
      id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    // If this is the first address or marked as default, update others
    if (newAddress.isDefault || state.addresses.length === 0) {
      newAddress.isDefault = true;
      state.addresses = state.addresses.map((addr) => ({
        ...addr,
        isDefault: false,
      }));
    }

    state.addresses = [...state.addresses, newAddress];

    try {
      await userRepository.update(userId, {
        shippingAddresses: state.addresses,
      });
      return true;
    } catch (error) {
      console.error("Error adding shipping address:", error);
      // Revert on error
      state.addresses = state.addresses.filter((addr) => addr.id !== newAddress.id);
      return false;
    }
  };

  const updateAddress = async (userId: string, addressId: string, updates: Partial<UserShippingAddress>): Promise<boolean> => {
    const index = state.addresses.findIndex((addr) => addr.id === addressId);
    if (index === -1) return false;

    const previousAddresses = [...state.addresses];

    // If setting as default, update others
    if (updates.isDefault) {
      state.addresses = state.addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === addressId,
      }));
    } else {
      state.addresses[index] = { ...state.addresses[index], ...updates };
    }

    try {
      await userRepository.update(userId, {
        shippingAddresses: state.addresses,
      });
      return true;
    } catch (error) {
      console.error("Error updating shipping address:", error);
      state.addresses = previousAddresses;
      return false;
    }
  };

  const removeAddress = async (userId: string, addressId: string): Promise<boolean> => {
    const previousAddresses = [...state.addresses];
    const removedAddress = state.addresses.find((addr) => addr.id === addressId);

    state.addresses = state.addresses.filter((addr) => addr.id !== addressId);

    // If we removed the default, set another as default
    if (removedAddress?.isDefault && state.addresses.length > 0) {
      state.addresses[0].isDefault = true;
    }

    try {
      await userRepository.update(userId, {
        shippingAddresses: state.addresses,
      });

      // Clear selection if it was the selected one
      if (state.selectedAddressId === addressId) {
        state.selectedAddressId = null;
      }

      return true;
    } catch (error) {
      console.error("Error removing shipping address:", error);
      state.addresses = previousAddresses;
      return false;
    }
  };

  const selectAddress = (addressId: string | null): void => {
    state.selectedAddressId = addressId;
  };

  const setDefaultAddress = async (userId: string, addressId: string): Promise<boolean> => {
    return updateAddress(userId, addressId, { isDefault: true });
  };

  const reset = (): void => {
    state.addresses = [];
    state.selectedAddressId = null;
    state.initialized = false;
    state.currentUserId = null;
    state.loading = false;
    loadingPromise = null;
  };

  return {
    addresses,
    selectedAddress,
    shippingCost,
    loading,
    initialized,
    loadAddresses,
    addAddress,
    updateAddress,
    removeAddress,
    selectAddress,
    setDefaultAddress,
    reset,
  };
};
