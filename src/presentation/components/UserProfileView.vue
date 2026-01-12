<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuth } from '../../application/stores/authStore';
import { formatDate } from '../utils/formatters';

const { user, signOut, initAuth } = useAuth();

const handleSignOut = async () => {
  if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
    await signOut();
    window.location.href = '/';
  }
};

onMounted(() => {
  initAuth();
});
</script>

<template>
  <div v-if="user" class="flex flex-col gap-12">
    <!-- Header del Perfil Propio -->
    <div class="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-black/5 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
      <!-- Avatar con inicial o foto de Google -->
      <div class="w-32 h-32 md:w-40 md:h-40 bg-primary rounded-full flex items-center justify-center text-white text-5xl md:text-6xl font-black shadow-xl shadow-primary/20 flex-shrink-0 overflow-hidden border-4 border-white">
        <img v-if="user.photoURL" :src="user.photoURL" :alt="user.displayName || 'Usuario'" class="w-full h-full object-cover" />
        <span v-else>{{ user.displayName?.charAt(0).toUpperCase() || 'U' }}</span>
      </div>

      <div class="flex-1 text-center md:text-left">
        <div class="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <h1 class="text-4xl font-black text-gray-900 tracking-tight">{{ user.displayName || 'Usuario Naya' }}</h1>
          <span class="inline-flex items-center gap-2 bg-primary/5 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-primary/10">
            Miembro Naya
          </span>
        </div>

        <p class="text-gray-500 text-lg mb-8">
          {{ user.email }}
        </p>

        <div class="flex flex-wrap justify-center md:justify-start gap-4">
          <a href="/edit-profile" class="bg-background-secondary text-gray-900 px-8 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95 border border-black/5 inline-block">
            Editar Perfil
          </a>
          <button @click="handleSignOut" class="bg-error/5 text-error px-8 py-3 rounded-2xl font-bold hover:bg-error/10 transition-all active:scale-95 border border-error/10">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>

    <!-- Secciones de Usuario -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <a href="/sell" class="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm hover:shadow-md transition-all group">
        <div class="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center mb-6 text-success group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h3 class="text-xl font-black text-gray-900 mb-2">Vender algo</h3>
        <p class="text-gray-500 text-sm">Sube una nueva prenda a tu armario y dale una segunda vida.</p>
      </a>

      <div class="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm hover:shadow-md transition-all group cursor-pointer">
        <div class="w-12 h-12 bg-warning/10 rounded-2xl flex items-center justify-center mb-6 text-warning group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h3 class="text-xl font-black text-gray-900 mb-2">Mis Compras</h3>
        <p class="text-gray-500 text-sm">Revisa el estado de tus pedidos y tus tesoros adquiridos.</p>
      </div>
    </div>
  </div>
</template>
