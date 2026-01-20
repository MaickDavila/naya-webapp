<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useFirestore, useDocument } from 'vuefire';
import { doc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../../application/stores/authStore';
import { FirestoreUserRepository } from '../../infrastructure/repositories/FirestoreUserRepository';
import { UpdateUserProfile } from '../../application/use-cases/UpdateUserProfile';
import { UserMapper } from '../../infrastructure/mappers/UserMapper';
import { COLLECTIONS } from '../../domain/constants/collections';
import type { User } from '../../domain/entities/User';

const { user, initAuth } = useAuth();
const db = useFirestore();
const storage = getStorage();
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

// Estado de la foto de perfil
const currentPhotoURL = ref<string | null>(null);
const newPhotoFile = ref<File | null>(null);
const newPhotoPreview = ref<string | null>(null);
const uploadingPhoto = ref(false);

const saving = ref(false);
const success = ref(false);

// Input file reference
const photoInput = ref<HTMLInputElement | null>(null);

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
    currentPhotoURL.value = userEntity.photoURL || null;
  } else if (authUser && !data) {
    // Si no existe en Firestore aún (primer login), usamos los datos de Google
    formData.value.displayName = authUser.displayName || '';
    currentPhotoURL.value = authUser.photoURL || null;
  }
}, { immediate: true });

// Abrir selector de archivos
const triggerPhotoSelect = () => {
  photoInput.value?.click();
};

// Manejar selección de foto
const handlePhotoSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (!file) return;
  
  // Validar tipo de archivo
  if (!file.type.startsWith('image/')) {
    alert('Por favor selecciona una imagen válida');
    return;
  }
  
  // Validar tamaño (max 10MB antes de compresión)
  if (file.size > 10 * 1024 * 1024) {
    alert('La imagen es demasiado grande. Máximo 10MB');
    return;
  }
  
  try {
    // Comprimir imagen
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 500,
      useWebWorker: true,
    });
    
    newPhotoFile.value = compressedFile;
    
    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      newPhotoPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(compressedFile);
  } catch (error) {
    console.error('Error al procesar la imagen:', error);
    alert('Error al procesar la imagen');
  }
};

// Eliminar foto seleccionada
const removeNewPhoto = () => {
  newPhotoFile.value = null;
  newPhotoPreview.value = null;
  if (photoInput.value) {
    photoInput.value.value = '';
  }
};

// Subir foto a Storage
const uploadPhoto = async (): Promise<string | null> => {
  if (!newPhotoFile.value || !user.value) return null;
  
  uploadingPhoto.value = true;
  try {
    const fileName = `profile_${Date.now()}.jpg`;
    const photoRef = storageRef(storage, `users/${user.value.uid}/profile/${fileName}`);
    
    await uploadBytes(photoRef, newPhotoFile.value);
    const downloadURL = await getDownloadURL(photoRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error al subir la foto:', error);
    throw error;
  } finally {
    uploadingPhoto.value = false;
  }
};

const handleSave = async () => {
  if (!user.value) return;
  saving.value = true;
  success.value = false;
  try {
    // Subir nueva foto si hay una
    let photoURL: string | undefined = currentPhotoURL.value || undefined;
    if (newPhotoFile.value) {
      const uploadedURL = await uploadPhoto();
      if (uploadedURL) {
        photoURL = uploadedURL;
      }
    }
    
    // Construir objeto de actualización solo con campos válidos
    const updateData: Record<string, any> = {
      displayName: formData.value.displayName,
      name: formData.value.displayName,
      biography: formData.value.biography || null,
      location: formData.value.location || null,
    };
    
    // Solo incluir photoURL si es una URL válida (no una ruta de archivo local)
    if (photoURL && photoURL.startsWith('http')) {
      updateData.photoURL = photoURL;
    }
    
    await updateUseCase.execute(user.value.uid, updateData);
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

// Computed para mostrar la foto actual
const displayPhoto = computed(() => {
  return newPhotoPreview.value || currentPhotoURL.value;
});

const userInitial = computed(() => {
  const name = formData.value.displayName || user.value?.displayName || '';
  return name.charAt(0).toUpperCase() || '?';
});

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
        <!-- Foto de Perfil -->
        <div class="flex flex-col gap-4">
          <label class="text-xs font-black uppercase tracking-widest text-gray-400 ml-4">Foto de Perfil</label>
          
          <div class="flex items-center gap-6">
            <!-- Avatar actual o preview -->
            <div class="relative">
              <div 
                class="w-24 h-24 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border-4 border-white shadow-lg"
              >
                <img 
                  v-if="displayPhoto" 
                  :src="displayPhoto" 
                  alt="Foto de perfil" 
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-3xl font-black text-primary">{{ userInitial }}</span>
              </div>
              
              <!-- Indicador de nueva foto -->
              <div 
                v-if="newPhotoPreview" 
                class="absolute -top-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center shadow-md"
              >
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <!-- Botones de acción -->
            <div class="flex flex-col gap-2">
              <button
                type="button"
                @click="triggerPhotoSelect"
                class="px-5 py-2.5 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors flex items-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{{ newPhotoPreview ? 'Cambiar' : 'Subir foto' }}</span>
              </button>
              
              <button
                v-if="newPhotoPreview"
                type="button"
                @click="removeNewPhoto"
                class="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Descartar</span>
              </button>
            </div>
          </div>
          
          <!-- Input oculto -->
          <input
            ref="photoInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handlePhotoSelect"
          />
          
          <p class="text-xs text-gray-400 ml-4">JPG, PNG o GIF. Maximo 10MB.</p>
        </div>

        <!-- Nombre Público -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-black uppercase tracking-widest text-gray-400 ml-4">Nombre Publico</label>
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
            :disabled="saving || success || uploadingPhoto"
            class="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/25 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg v-if="saving || uploadingPhoto" class="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else-if="success" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{{ uploadingPhoto ? 'Subiendo foto...' : saving ? 'Guardando...' : success ? 'Perfil Actualizado' : 'Guardar Cambios' }}</span>
          </button>
          
          <a href="/profile" class="text-center py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors">
            Cancelar
          </a>
        </div>
      </form>
    </div>
  </div>
</template>
