<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { UserShippingAddress } from "../../../domain/entities/ShippingAddress";
import { PERU_DEPARTMENTS, LIMA_DISTRICTS } from "../../../domain/entities/ShippingAddress";

const props = defineProps<{
  address?: UserShippingAddress;
  isSubmitting?: boolean;
}>();

const emit = defineEmits<{
  (e: "submit", address: Omit<UserShippingAddress, "id" | "createdAt">): void;
  (e: "cancel"): void;
}>();

// Form state
const label = ref(props.address?.label || "");
const recipientName = ref(props.address?.recipientName || "");
const phone = ref(props.address?.phone || "");
const street = ref(props.address?.street || "");
const number = ref(props.address?.number || "");
const apartment = ref(props.address?.apartment || "");
const district = ref(props.address?.district || "");
const city = ref(props.address?.city || "");
const state = ref(props.address?.state || "");
const zipCode = ref(props.address?.zipCode || "");
const reference = ref(props.address?.reference || "");
const isDefault = ref(props.address?.isDefault || false);

// Show districts dropdown only for Lima Metropolitana
const showDistricts = computed(() => state.value === "Lima Metropolitana");

// Reset district when state changes
watch(state, (newState) => {
  if (newState !== "Lima Metropolitana") {
    district.value = "";
  }
});

const handleSubmit = () => {
  emit("submit", {
    label: label.value,
    recipientName: recipientName.value,
    phone: phone.value,
    street: street.value,
    number: number.value,
    apartment: apartment.value || undefined,
    district: district.value,
    city: city.value || district.value,
    state: state.value,
    zipCode: zipCode.value || undefined,
    country: "Peru",
    reference: reference.value || undefined,
    isDefault: isDefault.value,
  });
};

const isValid = computed(() => {
  return (
    label.value.trim() &&
    recipientName.value.trim() &&
    phone.value.trim() &&
    street.value.trim() &&
    number.value.trim() &&
    state.value.trim() &&
    (showDistricts.value ? district.value.trim() : true)
  );
});
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Label -->
    <div>
      <label class="block text-sm font-bold text-gray-700 mb-2">
        Nombre de la direccion *
      </label>
      <input
        v-model="label"
        type="text"
        placeholder="Ej: Casa, Oficina, etc."
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        required
      />
    </div>

    <!-- Recipient Name -->
    <div>
      <label class="block text-sm font-bold text-gray-700 mb-2">
        Nombre del destinatario *
      </label>
      <input
        v-model="recipientName"
        type="text"
        placeholder="Nombre completo de quien recibe"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        required
      />
    </div>

    <!-- Phone -->
    <div>
      <label class="block text-sm font-bold text-gray-700 mb-2">
        Telefono de contacto *
      </label>
      <input
        v-model="phone"
        type="tel"
        placeholder="Ej: 999 999 999"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        required
      />
    </div>

    <!-- Department/State -->
    <div>
      <label class="block text-sm font-bold text-gray-700 mb-2">
        Departamento *
      </label>
      <select
        v-model="state"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
        required
      >
        <option value="">Selecciona un departamento</option>
        <option v-for="dept in PERU_DEPARTMENTS" :key="dept" :value="dept">
          {{ dept }}
        </option>
      </select>
    </div>

    <!-- District (only for Lima Metropolitana) -->
    <div v-if="showDistricts">
      <label class="block text-sm font-bold text-gray-700 mb-2">
        Distrito *
      </label>
      <select
        v-model="district"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
        required
      >
        <option value="">Selecciona un distrito</option>
        <option v-for="dist in LIMA_DISTRICTS" :key="dist" :value="dist">
          {{ dist }}
        </option>
      </select>
    </div>

    <!-- City (for provinces) -->
    <div v-else>
      <label class="block text-sm font-bold text-gray-700 mb-2">
        Ciudad / Provincia
      </label>
      <input
        v-model="city"
        type="text"
        placeholder="Nombre de la ciudad o provincia"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
      />
    </div>

    <!-- Street and Number -->
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2">
        <label class="block text-sm font-bold text-gray-700 mb-2">
          Calle / Avenida *
        </label>
        <input
          v-model="street"
          type="text"
          placeholder="Nombre de la calle o avenida"
          class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          required
        />
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 mb-2">
          Numero *
        </label>
        <input
          v-model="number"
          type="text"
          placeholder="Ej: 123"
          class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          required
        />
      </div>
    </div>

    <!-- Apartment -->
    <div>
      <label class="block text-sm font-bold text-gray-700 mb-2">
        Dpto / Piso / Interior
      </label>
      <input
        v-model="apartment"
        type="text"
        placeholder="Ej: Dpto 201, Piso 3"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
      />
    </div>

    <!-- Reference -->
    <div>
      <label class="block text-sm font-bold text-gray-700 mb-2">
        Referencia
      </label>
      <textarea
        v-model="reference"
        placeholder="Ej: Cerca al parque, edificio azul, etc."
        rows="2"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
      ></textarea>
    </div>

    <!-- Zip Code -->
    <div>
      <label class="block text-sm font-bold text-gray-700 mb-2">
        Codigo Postal
      </label>
      <input
        v-model="zipCode"
        type="text"
        placeholder="Ej: 15001"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
      />
    </div>

    <!-- Default Address -->
    <div class="flex items-center gap-3">
      <input
        v-model="isDefault"
        type="checkbox"
        id="isDefault"
        class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
      />
      <label for="isDefault" class="text-sm text-gray-700">
        Establecer como direccion principal
      </label>
    </div>

    <!-- Actions -->
    <div class="flex gap-4 pt-4">
      <button
        type="button"
        @click="emit('cancel')"
        class="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="!isValid || isSubmitting"
        class="flex-1 py-4 rounded-2xl font-bold text-white bg-primary hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isSubmitting ? "Guardando..." : address ? "Actualizar" : "Guardar" }}
      </button>
    </div>
  </form>
</template>
