<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ToastContainer from './ToastContainer.vue';

const navItems = [
  { 
    id: 'inicio', 
    label: 'Inicio', 
    href: '/',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />` 
  },
  { 
    id: 'vender', 
    label: 'Vender', 
    href: '/sell',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />` 
  },
  { 
    id: 'productos', 
    label: 'Mis Productos', 
    href: '/my-products',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />` 
  },
  { 
    id: 'perfil', 
    label: 'Perfil', 
    href: '/profile',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />` 
  }
];

const activeTab = ref('inicio');

onMounted(() => {
  const currentPath = window.location.pathname;
  const activeItem = navItems.find(item => item.href === currentPath);
  if (activeItem) {
    activeTab.value = activeItem.id;
  }
});

const navigate = (href?: string, id?: string) => {
  if (href) {
    window.location.href = href;
  } else if (id) {
    activeTab.value = id;
  }
};
</script>

<template>
  <!-- Toast notifications -->
  <ToastContainer />

  <nav class="fixed bottom-0 left-0 right-0 bg-[#D9D2C8] border-t border-black/5 pb-safe z-50">
    <div class="max-w-md mx-auto flex justify-around items-center h-20">
      <button 
        v-for="item in navItems" 
        :key="item.id"
        @click="navigate(item.href, item.id)"
        class="flex flex-col items-center justify-center w-full gap-1 transition-all duration-300"
        :class="activeTab === item.id ? 'text-primary' : 'text-gray-600'"
      >
        <svg 
          class="w-7 h-7" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          v-html="item.icon"
        ></svg>
        <span class="text-[11px] font-bold uppercase tracking-wider">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
