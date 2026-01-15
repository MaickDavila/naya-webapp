<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useFirestore, useDocument } from 'vuefire';
import { doc } from 'firebase/firestore';
import { useAuth } from '../../application/stores/authStore';
import { FirestoreUserRepository } from '../../infrastructure/repositories/FirestoreUserRepository';
import { UpdateUserProfile } from '../../application/use-cases/UpdateUserProfile';
import { UserMapper } from '../../infrastructure/mappers/UserMapper';
import { COLLECTIONS } from '../../domain/constants/collections';
import type { User } from '../../domain/entities/User';

const { user, initAuth } = useAuth();
const db = useFirestore();
const userRepo = new FirestoreUserRepository();
const updateUseCase = new UpdateUserProfile(userRepo);

// Referencia reactiva al documento del usuario
const userDocRef = computed(() => 
  user.value ? doc(db, COLLECTIONS.USERS, user.value.uid) : null
);

// useDocument carga y mantiene actualizado el documento del usuario
const { data: userData, pending: loading } = useDocument(
  userDocRef,
  {
    wait: true,
  }
);

// Formulario reactivo
const formData = ref({
  displayName: '',
  biography: '',
  location: ''
});

const saving = ref(false);
const success = ref(false);

// Cargar datos del usuario cuando estén disponibles
watch([userData, user], ([data, authUser]) => {
  if (data && authUser) {
    // Mapear datos de Firestore a entidad de dominio
    const userEntity = UserMapper.toDomain(authUser.uid, data);
    formData.value = {
      displayName: userEntity.displayName || userEntity.name || '',
      biography: userEntity.biography || '',
      location: userEntity.location || ''
    };
  } else if (authUser && !data) {
    // Si no existe en Firestore aún (primer login), usamos los datos de Google
    formData.value.displayName = authUser.displayName || '';
  }
}, { immediate: true });

const handleSave = async () => {
  if (!user.value) return;
  saving.value = true;
  success.value = false;
  try {
    await updateUseCase.execute(user.value.uid, {
      ...formData.value,
      name: formData.value.displayName // Mantener consistencia
    });
    success.value = true;
    setTimeout(() => {
      window.location.href = '/profile';
    }, 1500);
  } catch (error) {
    console.error("Error actualizando perfil:", error);
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  initAuth();
});
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-black/5">
      <div class="flex items-center gap-4 mb-10 pb-6 border-b border-black/5">
        <div class="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 class="text-3xl font-black text-gray-900 tracking-tight">Editar Perfil</h1>
      </div>

      <div v-if="loading" class="py-20 flex flex-col items-center justify-center">
        <div class="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p class="text-gray-400 italic">Cargando tus datos...</p>
      </div>

      <form v-else @submit.prevent="handleSave" class="flex flex-col gap-8">
        <!-- Nombre Público -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-black uppercase tracking-widest text-gray-400 ml-4">Nombre Público</label>
          <input 
            v-model="formData.displayName"
            type="text" 
            placeholder="¿Cómo quieres que te llamen?" 
            class="w-full bg-background-secondary/50 border-transparent focus:bg-white focus:border-primary/20 focus:ring-0 rounded-2xl py-4 px-6 transition-all text-lg font-bold"
            required
          />
        </div>

        <!-- Ubicación -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-black uppercase tracking-widest text-gray-400 ml-4">Ubicación</label>
          <input 
            v-model="formData.location"
            type="text" 
            placeholder="Ej: Lima, Perú" 
            class="w-full bg-background-secondary/50 border-transparent focus:bg-white focus:border-primary/20 focus:ring-0 rounded-2xl py-4 px-6 transition-all text-lg font-bold"
          />
        </div>

        <!-- Biografía -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-black uppercase tracking-widest text-gray-400 ml-4">Biografía</label>
          <textarea 
            v-model="formData.biography"
            rows="4"
            placeholder="Cuéntales un poco sobre tu estilo o lo que vendes..." 
            class="w-full bg-background-secondary/50 border-transparent focus:bg-white focus:border-primary/20 focus:ring-0 rounded-2xl py-4 px-6 transition-all text-lg leading-relaxed"
          ></textarea>
        </div>

        <!-- Botones de Acción -->
        <div class="flex flex-col gap-4 mt-4">
          <button 
            type="submit"
            :disabled="saving || success"
            class="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/25 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg v-if="saving" class="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else-if="success" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{{ saving ? 'Guardando...' : success ? '¡Perfil Actualizado!' : 'Guardar Cambios' }}</span>
          </button>
          
          <a href="/profile" class="text-center py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors">
            Cancelar
          </a>
        </div>
      </form>
    </div>
  </div>
</template>
