<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useAuth } from '../../../application/stores/authStore';

const { signInWithGoogle, isAuthenticated, loading, initAuth } = useAuth();

// Obtener el parámetro 'next' de la URL
const urlParams = new URLSearchParams(window.location.search);
const nextPage = urlParams.get('next') || '/';

const handleGoogleSignIn = async () => {
  try {
    await signInWithGoogle();
  } catch (error) {
    // El error ya se loguea en la store
  }
};

// Redirigir si ya está autenticado
watch(isAuthenticated, (val) => {
  if (val) {
    window.location.href = nextPage;
  }
}, { immediate: true });

onMounted(() => {
  initAuth();
});
</script>

<template>
  <div class="w-full max-w-md mx-auto">
    <div class="bg-white rounded-[3rem] p-10 md:p-16 shadow-xl border border-black/5 text-center flex flex-col items-center">
      <div class="w-20 h-20 bg-background-secondary rounded-[2rem] flex items-center justify-center mb-8 shadow-sm">
        <svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <h1 class="text-4xl font-black text-gray-900 tracking-tight mb-4">Bienvenido a Naya</h1>
      <p class="text-gray-500 mb-12 leading-relaxed">Inicia sesión para descubrir tesoros únicos y vender tus propias prendas.</p>

      <!-- Botón Google -->
      <button 
        @click="handleGoogleSignIn"
        :disabled="loading"
        class="w-full flex items-center justify-center gap-4 bg-white border-2 border-black/5 hover:border-primary/20 py-4 px-6 rounded-[2rem] font-bold text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
      >
        <svg class="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.01h2.64c1.54-1.42 2.43-3.5 2.43-5.94z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-2.64-2.01c-.73.48-1.66.76-2.64.76-2.85 0-5.27-1.92-6.13-4.51H2.18v2.09C3.99 20.24 7.75 23 12 23z"/>
          <path fill="#FBBC05" d="M5.87 14.58c-.23-.69-.35-1.43-.35-2.08s.13-1.39.35-2.08V8.33H2.18C1.4 9.91 1 11.66 1 12.5s.4 2.59 1.18 4.17l3.69-2.09z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.75 1 3.99 3.76 2.18 7.41l3.69 2.09c.86-2.59 3.28-4.51 6.13-4.51z"/>
        </svg>
        <span>Continuar con Google</span>
      </button>

      <!-- Divisor -->
      <div class="flex items-center w-full my-8 gap-4">
        <div class="h-px bg-black/5 flex-1"></div>
        <span class="text-xs font-black text-gray-300 uppercase tracking-widest">o</span>
        <div class="h-px bg-black/5 flex-1"></div>
      </div>

      <!-- Otros métodos -->
      <div class="flex flex-col gap-4 w-full">
        <button class="w-full text-gray-400 font-bold text-sm hover:text-primary transition-colors">
          Usar correo electrónico
        </button>
        
        <a href="/" class="w-full text-primary font-black text-sm uppercase tracking-widest hover:underline pt-2">
          Seguir sin iniciar sesión
        </a>
      </div>

      <p class="mt-12 text-[10px] text-gray-400 leading-relaxed max-w-xs uppercase tracking-widest font-bold">
        Al continuar, aceptas nuestros términos de servicio y política de privacidad.
      </p>
    </div>
  </div>
</template>
