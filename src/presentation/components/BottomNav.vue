<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ToastContainer from './ToastContainer.vue';

const activeTab = ref('inicio');

const navItems = [
  { id: 'inicio', label: 'INICIO', href: '/' },
  { id: 'buscar', label: 'BUSCAR', href: '/search' },
  { id: 'favoritos', label: 'FAVORITOS', href: '/favorites' },
  { id: 'perfil', label: 'PERFIL', href: '/profile' },
];

onMounted(() => {
  const currentPath = window.location.pathname;
  const activeItem = navItems.find(item => item.href === currentPath);
  if (activeItem) {
    activeTab.value = activeItem.id;
  }
});

const navigate = (href: string, id: string) => {
  activeTab.value = id;
  window.location.href = href;
};
</script>

<template>
  <!-- Toast notifications -->
  <ToastContainer />

  <nav class="fixed bottom-0 left-0 right-0 bg-[#dad1c8] border-t border-black/5 pb-safe z-50">
    <div class="max-w-md mx-auto flex items-center justify-around h-[60px] px-4">
      <!-- INICIO -->
      <button
        @click="navigate('/', 'inicio')"
        class="pt-3 text-xs font-normal text-black tracking-wide"
        :class="activeTab === 'inicio' ? 'font-bold' : ''"
      >
        INICIO
      </button>

      <!-- BUSCAR -->
      <button
        @click="navigate('/search', 'buscar')"
        class="pt-3 text-xs font-normal text-black tracking-wide"
        :class="activeTab === 'buscar' ? 'font-bold' : ''"
      >
        BUSCAR
      </button>

      <!-- Botón central + -->
      <a
        href="/sell"
        class="flex items-center justify-center w-[39px] h-[36px] bg-[#eeeae6] rounded-[5px] text-black text-[35px] font-normal leading-none -mt-1"
      >
        +
      </a>

      <!-- FAVORITOS -->
      <button
        @click="navigate('/favorites', 'favoritos')"
        class="pt-3 text-xs font-normal text-black tracking-wide"
        :class="activeTab === 'favoritos' ? 'font-bold' : ''"
      >
        FAVORITOS
      </button>

      <!-- PERFIL -->
      <button
        @click="navigate('/profile', 'perfil')"
        class="pt-3 text-xs font-normal text-black tracking-wide"
        :class="activeTab === 'perfil' ? 'font-bold' : ''"
      >
        PERFIL
      </button>
    </div>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
