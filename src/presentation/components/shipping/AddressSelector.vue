<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAuth } from "../../../application/stores/authStore";
import { useShipping } from "../../../application/stores/shippingStore";
import { formatPrice } from "../../utils/formatters";
import AddressForm from "./AddressForm.vue";
import type { UserShippingAddress } from "../../../domain/entities/ShippingAddress";

const { user, initAuth } = useAuth();
const {
  addresses,
  selectedAddress,
  shippingCost,
  loading,
  loadAddresses,
  addAddress,
  selectAddress,
} = useShipping();

const showAddForm = ref(false);
const isSubmitting = ref(false);

onMounted(async () => {
  await initAuth();
  if (user.value) {
    await loadAddresses(user.value.uid);
  }
});

// Watch for user changes
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
  const success = await addAddress(user.value.uid, addressData);
  isSubmitting.value = false;

  if (success) {
    showAddForm.value = false;
  }
};

const handleSelectAddress = (addressId: string) => {
  selectAddress(addressId);
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
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-black text-gray-900">Direccion de envio</h3>
      <button
        v-if="!showAddForm && addresses.length > 0"
        @click="showAddForm = true"
        class="text-primary font-bold text-sm hover:underline"
      >
        + Agregar nueva
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="h-20 bg-gray-100 rounded-2xl"></div>
      <div class="h-20 bg-gray-100 rounded-2xl"></div>
    </div>

    <!-- Add Form -->
    <div v-else-if="showAddForm || addresses.length === 0" class="bg-gray-50 rounded-2xl p-6">
      <h4 class="font-bold text-gray-900 mb-4">
        {{ addresses.length === 0 ? "Agrega tu primera direccion" : "Nueva direccion" }}
      </h4>
      <AddressForm
        :is-submitting="isSubmitting"
        @submit="handleAddAddress"
        @cancel="showAddForm = false"
      />
    </div>

    <!-- Address List -->
    <div v-else class="space-y-3">
      <button
        v-for="addr in addresses"
        :key="addr.id"
        @click="handleSelectAddress(addr.id)"
        :class="[
          'w-full text-left p-4 rounded-2xl border-2 transition-all',
          selectedAddress?.id === addr.id
            ? 'border-primary bg-primary/5'
            : 'border-gray-100 hover:border-gray-200 bg-white',
        ]"
      >
        <div class="flex items-start gap-3">
          <!-- Radio indicator -->
          <div
            :class="[
              'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
              selectedAddress?.id === addr.id ? 'border-primary' : 'border-gray-300',
            ]"
          >
            <div
              v-if="selectedAddress?.id === addr.id"
              class="w-2.5 h-2.5 rounded-full bg-primary"
            ></div>
          </div>

          <!-- Address info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-bold text-gray-900">{{ addr.label }}</span>
              <span
                v-if="addr.isDefault"
                class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold"
              >
                Principal
              </span>
            </div>
            <p class="text-sm text-gray-600">{{ addr.recipientName }}</p>
            <p class="text-sm text-gray-500">{{ formatAddressLine(addr) }}</p>
            <p class="text-sm text-gray-500">{{ formatLocationLine(addr) }}</p>
            <p class="text-sm text-gray-400">Tel: {{ addr.phone }}</p>
          </div>
        </div>
      </button>

      <!-- Shipping Cost Info -->
      <div
        v-if="selectedAddress && shippingCost"
        class="bg-primary/5 rounded-2xl p-4 border border-primary/10"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="font-bold text-gray-900">Costo de envio</span>
          <span class="font-black text-primary text-lg">
            {{ formatPrice(shippingCost.price) }}
          </span>
        </div>
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Entrega estimada: {{ shippingCost.estimatedDays }}</span>
        </div>
        <p v-if="shippingCost.description" class="text-xs text-gray-500 mt-1">
          {{ shippingCost.description }}
        </p>
      </div>
    </div>

    <!-- Link to manage addresses -->
    <a
      v-if="addresses.length > 0 && !showAddForm"
      href="/addresses"
      class="block text-center text-sm text-gray-500 hover:text-primary transition-colors"
    >
      Gestionar mis direcciones
    </a>
  </div>
</template>
