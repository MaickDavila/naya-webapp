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

  <nav class="bottom-nav fixed bottom-0 left-0 right-0 border-t border-white/10 pb-safe z-50 lg:hidden">
    <div class="max-w-md mx-auto grid grid-cols-4 h-[64px] px-3">
      <!-- INICIO -->
      <button
        @click="navigate('/', 'inicio')"
        class="flex flex-col items-center justify-center gap-0.5 text-[10px] font-normal text-white tracking-wide"
        :class="activeTab === 'inicio' ? 'font-bold' : ''"
        aria-label="Inicio"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-6h6v6" />
        </svg>
        <span>INICIO</span>
      </button>

      <!-- BUSCAR -->
      <button
        @click="navigate('/search', 'buscar')"
        class="flex flex-col items-center justify-center gap-0.5 text-[10px] font-normal text-white tracking-wide"
        :class="activeTab === 'buscar' ? 'font-bold' : ''"
        aria-label="Buscar"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-5.2-5.2m1.7-5.3a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
        </svg>
        <span>BUSCAR</span>
      </button>

      <!-- FAVORITOS -->
      <button
        @click="navigate('/favorites', 'favoritos')"
        class="flex flex-col items-center justify-center gap-0.5 text-[10px] font-normal text-white tracking-wide"
        :class="activeTab === 'favoritos' ? 'font-bold' : ''"
        aria-label="Favoritos"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
        <span>FAVORITOS</span>
      </button>

      <!-- PERFIL -->
      <button
        @click="navigate('/profile', 'perfil')"
        class="flex flex-col items-center justify-center gap-0.5 text-[10px] font-normal text-white tracking-wide"
        :class="activeTab === 'perfil' ? 'font-bold' : ''"
        aria-label="Perfil"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM4.5 21a7.5 7.5 0 0 1 15 0" />
        </svg>
        <span>PERFIL</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.bottom-nav {
  background-color: var(--color-primary);
  /* Forzar compositing layer para evitar que mobile Safari pierda
     el bg al hacer rubber-band / scroll con la URL bar colapsando. */
  transform: translateZ(0);
  will-change: transform;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
