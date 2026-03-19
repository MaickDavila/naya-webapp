<script setup lang="ts">
import { ref } from 'vue';
import SellModal from './SellModal.vue';

const sellModalOpen = ref(false);

const openSellModal = () => {
  sellModalOpen.value = true;
};
</script>

<template>
  <div class="inline-flex">
    <button
      type="button"
      class="flex items-center justify-center min-w-[88px] h-10 px-4 bg-[#eeeae6] hover:bg-[#e5e0d8] rounded-lg text-sm font-semibold text-black transition-colors"
      @click="openSellModal"
    >
      Vender
    </button>
    <SellModal :open="sellModalOpen" @close="sellModalOpen = false" />
  </div>
</template>
