<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useAuth } from "../../application/stores/authStore";
import { useShipping } from "../../application/stores/shippingStore";
import { useToast } from "../../application/stores/toastStore";
import { formatPrice } from "../utils/formatters";
import AddressForm from "./shipping/AddressForm.vue";
import ProfileHeader from "./ProfileHeader.vue";
import type { UserShippingAddress } from "../../domain/entities/ShippingAddress";
import { calculateShippingCost } from "../../domain/entities/ShippingAddress";

const { user, initAuth, loading: authLoading } = useAuth();
const {
  addresses,
  loading: shippingLoading,
  loadAddresses,
  addAddress,
  updateAddress,
  removeAddress,
  setDefaultAddress,
} = useShipping();
const { success, error: showError } = useToast();

const showAddForm = ref(false);
const editingAddress = ref<UserShippingAddress | null>(null);
const isSubmitting = ref(false);
const deletingId = ref<string | null>(null);

onMounted(async () => {
  await initAuth();
  if (user.value) {
    await loadAddresses(user.value.uid);
  }
});

watch(
  () => user.value,
  async (newUser) => {
    if (newUser) {
      await loadAddresses(newUser.uid);
    }
  }
);

const handleAddAddress = async (addressData: Omit<UserShippingAddress, "id" | "createdAt">) => {
  if (!user.value) return;

  isSubmitting.value = true;
  const result = await addAddress(user.value.uid, addressData);
  isSubmitting.value = false;

  if (result) {
    success("Direccion agregada correctamente");
    showAddForm.value = false;
  } else {
    showError("Error al agregar la direccion");
  }
};

const handleUpdateAddress = async (addressData: Omit<UserShippingAddress, "id" | "createdAt">) => {
  if (!user.value || !editingAddress.value) return;

  isSubmitting.value = true;
  const result = await updateAddress(user.value.uid, editingAddress.value.id, addressData);
  isSubmitting.value = false;

  if (result) {
    success("Direccion actualizada correctamente");
    editingAddress.value = null;
  } else {
    showError("Error al actualizar la direccion");
  }
};

const handleDeleteAddress = async (addressId: string) => {
  if (!user.value) return;
  if (!confirm("¿Estas seguro de eliminar esta direccion?")) return;

  deletingId.value = addressId;
  const result = await removeAddress(user.value.uid, addressId);
  deletingId.value = null;

  if (result) {
    success("Direccion eliminada correctamente");
  } else {
    showError("Error al eliminar la direccion");
  }
};

const handleSetDefault = async (addressId: string) => {
  if (!user.value) return;

  const result = await setDefaultAddress(user.value.uid, addressId);

  if (result) {
    success("Direccion principal actualizada");
  } else {
    showError("Error al actualizar direccion principal");
  }
};

const formatAddressLine = (addr: UserShippingAddress): string => {
  const parts = [addr.street, addr.number];
  if (addr.apartment) parts.push(addr.apartment);
  return parts.join(" ");
};

const formatLocationLine = (addr: UserShippingAddress): string => {
  const parts = [];
  if (addr.district) parts.push(addr.district);
  if (addr.city && addr.city !== addr.district) parts.push(addr.city);
  parts.push(addr.state);
  return parts.join(", ");
};

const getShippingCostForAddress = (addr: UserShippingAddress) => {
  return calculateShippingCost(addr);
};
</script>

<template>
  <div v-if="user" class="flex flex-col gap-8">
    <ProfileHeader active-tab="addresses" />

    <!-- Loading -->
    <div v-if="authLoading || shippingLoading" class="space-y-4">
      <div v-for="n in 3" :key="n" class="animate-pulse">
        <div class="h-32 bg-gray-100 rounded-2xl"></div>
      </div>
    </div>

    <!-- Not logged in (fallback) -->
    <div v-else-if="!user" class="text-center py-16">
      <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
      <h3 class="text-lg font-bold text-gray-900 mb-2">Inicia sesion</h3>
      <p class="text-gray-500 text-sm mb-6">
        Debes iniciar sesion para gestionar tus direcciones de envio.
      </p>
      <a
        href="/login?next=/addresses"
        class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary/90 transition-colors"
      >
        Iniciar sesion
      </a>
    </div>

    <!-- Address management -->
    <div v-else class="space-y-6">
      <!-- Add Form -->
      <div v-if="showAddForm" class="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-black/5">
        <h3 class="text-lg font-bold text-gray-900 mb-6">Nueva direccion</h3>
        <AddressForm
          :is-submitting="isSubmitting"
          @submit="handleAddAddress"
          @cancel="showAddForm = false"
        />
      </div>

      <!-- Edit Form -->
      <div v-else-if="editingAddress" class="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-black/5">
        <h3 class="text-lg font-bold text-gray-900 mb-6">Editar direccion</h3>
        <AddressForm
          :address="editingAddress"
          :is-submitting="isSubmitting"
          @submit="handleUpdateAddress"
          @cancel="editingAddress = null"
        />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="addresses.length === 0"
        class="text-center py-16 bg-white rounded-[2rem] shadow-sm border border-black/5"
      >
        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">No tienes direcciones guardadas</h3>
        <p class="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
          Agrega una direccion para poder recibir tus pedidos.
        </p>
        <button
          @click="showAddForm = true"
          class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary/90 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Agregar direccion
        </button>
      </div>

      <!-- Address List - Estilo perfil.pen -->
      <div v-else class="space-y-6">
        <div
          v-for="addr in addresses"
          :key="addr.id"
          class="border-b border-black/20 pb-6"
        >
          <p class="text-sm font-bold text-gray-900">{{ addr.label }}</p>
          <p class="text-sm text-gray-900">{{ formatAddressLine(addr) }}</p>
          <p class="text-xs text-gray-500">{{ formatLocationLine(addr) }}</p>
          <p class="text-sm text-gray-900">{{ addr.zipCode || addr.state }}</p>
          <div class="mt-3 flex justify-between items-center">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <span class="text-xs text-gray-600">
                Envio: <strong>{{ formatPrice(getShippingCostForAddress(addr).price) }}</strong>
              </span>
            </div>
            <div class="flex gap-2">
              <button
                v-if="!addr.isDefault"
                @click="handleSetDefault(addr.id)"
                class="text-xs text-primary font-bold hover:underline"
              >
                Principal
              </button>
              <button
                @click="editingAddress = addr"
                class="px-4 py-2 bg-primary text-white rounded-[15px] font-bold text-xs hover:bg-primary-dark transition-all shadow-md"
              >
                Editar
              </button>
              <button
                @click="handleDeleteAddress(addr.id)"
                :disabled="deletingId === addr.id"
                class="text-xs text-error font-bold hover:underline disabled:opacity-50"
              >
                {{ deletingId === addr.id ? "Eliminando..." : "Eliminar" }}
              </button>
            </div>
          </div>
        </div>

        <!-- Agregar Direccion - Estilo perfil.pen -->
        <button
          v-if="!showAddForm && !editingAddress"
          @click="showAddForm = true"
          class="w-full py-4 border-2 border-dashed border-primary/30 rounded-[15px] font-bold text-sm text-primary hover:bg-primary/5 transition-all"
        >
          Agregar Direccion
        </button>
      </div>
    </div>
  </div>
</template>
