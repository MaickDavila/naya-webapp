<script setup lang="ts">
import { computed, onMounted, ref, onUnmounted } from 'vue';
import { useFirestore, useDocument } from 'vuefire';
import { doc } from 'firebase/firestore';
import { useAuth } from '../../application/stores/authStore';
import { COLLECTIONS } from '../../domain/constants/collections';

type ProfileTab = 'for-sale' | 'purchases' | 'addresses';

interface Props {
  activeTab: ProfileTab;
}

const props = defineProps<Props>();

const { user, initAuth, signOut } = useAuth();
const db = useFirestore();

const menuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
};

const closeMenu = () => {
  menuOpen.value = false;
};

const handleLogout = async () => {
  closeMenu();
  await signOut();
  window.location.href = '/';
};

const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    closeMenu();
  }
};

onMounted(() => {
  initAuth();
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

const userDocRef = computed(() =>
  user.value ? doc(db, COLLECTIONS.USERS, user.value.uid) : null
);

const { data: userProfile } = useDocument(userDocRef);

const displayPhotoURL = computed(() => {
  return userProfile.value?.photoURL || user.value?.photoURL || null;
});

const displayName = computed(() => {
  return userProfile.value?.displayName || userProfile.value?.name || user.value?.displayName || 'Usuario Naya';
});

const username = computed(() => {
  const name = displayName.value;
  return name ? '@' + name.toLowerCase().replace(/\s+/g, '') : '@usuario';
});

const bio = computed(() => {
  if (userProfile.value?.biography) return userProfile.value.biography;
  if (userProfile.value?.instagram) return `Instagram: ${userProfile.value.instagram}`;
  return 'Cuenta tu historia y lo que te apasiona.';
});

const userInitial = computed(() => {
  return displayName.value.charAt(0).toUpperCase() || 'U';
});

const tabs = [
  { id: 'for-sale' as ProfileTab, label: 'FOR SALE', href: '/profile' },
  { id: 'purchases' as ProfileTab, label: 'MIS COMPRAS', href: '/my-purchases' },
  { id: 'addresses' as ProfileTab, label: 'MIS DIRECCIONES', href: '/addresses' },
];

const visibleTabs = computed(() =>
  tabs.filter((tab) => tab.id !== 'for-sale' || userProfile.value?.isSeller === true)
);

</script>

<template>
  <div v-if="user" class="flex flex-col -mx-6">
    <!-- Avatar + Info -->
    <div class="px-6 flex gap-6 items-end">
      <!-- Avatar -->
      <div
        class="w-[97px] h-[93px] rounded-[15px] overflow-hidden flex-shrink-0 border-4 border-white shadow-lg bg-primary flex items-center justify-center text-white text-3xl font-bold"
      >
        <img
          v-if="displayPhotoURL"
          :src="displayPhotoURL"
          :alt="displayName"
          class="w-full h-full object-cover"
        />
        <span v-else>{{ userInitial }}</span>
      </div>

      <!-- User info -->
      <div class="flex-1 min-w-0 pb-1">
        <p class="text-[15px] text-gray-900">{{ username }}</p>
        <h1 class="text-[15px] font-bold text-gray-900">{{ displayName }}</h1>
        <p class="text-[15px] text-gray-900 line-clamp-2">{{ bio }}</p>
      </div>

      <!-- Menu hamburguesa -->
      <div ref="menuRef" class="relative -mb-1 flex-shrink-0">
        <button
          type="button"
          @click="toggleMenu"
          class="p-2 hover:bg-black/5 rounded-full transition-colors"
          aria-label="Abrir menú"
          :aria-expanded="menuOpen"
        >
          <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Transition name="menu">
          <div
            v-if="menuOpen"
            class="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white shadow-lg border border-black/10 overflow-hidden z-40"
            role="menu"
          >
            <a
              href="/edit-profile"
              class="flex items-start gap-3 px-4 py-3 hover:bg-black/5 transition-colors"
              role="menuitem"
            >
              <svg class="w-5 h-5 text-gray-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />
              </svg>
              <span class="flex flex-col">
                <span class="text-[14px] font-semibold text-gray-900">Perfil</span>
                <span class="text-[12px] text-gray-500">Editar imagen de perfil, nombre, biografía, …</span>
              </span>
            </a>

            <a
              href="/edit-profile?tab=account"
              class="flex items-start gap-3 px-4 py-3 hover:bg-black/5 transition-colors border-t border-black/5"
              role="menuitem"
            >
              <svg class="w-5 h-5 text-gray-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 10a7 7 0 0 1 14 0M19 14l2 2-2 2" />
              </svg>
              <span class="flex flex-col">
                <span class="text-[14px] font-semibold text-gray-900">Centro de Cuenta</span>
                <span class="text-[12px] text-gray-500">Contraseña, seguridad, datos personales</span>
              </span>
            </a>

            <a
              href="/my-purchases"
              class="flex items-start gap-3 px-4 py-3 hover:bg-black/5 transition-colors border-t border-black/5"
              role="menuitem"
            >
              <svg class="w-5 h-5 text-gray-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M6 7h12l-1 12H7L6 7Zm3 0a3 3 0 0 1 6 0" />
              </svg>
              <span class="flex flex-col">
                <span class="text-[14px] font-semibold text-gray-900">Pedidos</span>
                <span class="text-[12px] text-gray-500">Te lleva a ver tus pedidos</span>
              </span>
            </a>

            <a
              href="mailto:Oficial@nayahcloset.com"
              class="flex items-start gap-3 px-4 py-3 hover:bg-black/5 transition-colors border-t border-black/5"
              role="menuitem"
            >
              <svg class="w-5 h-5 text-gray-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 21a9 9 0 1 1 9-9c0 4-3 5-6 5-1 0-2 1-2 2v2Z" />
              </svg>
              <span class="flex flex-col">
                <span class="text-[14px] font-semibold text-gray-900">Ayuda</span>
                <span class="text-[12px] text-gray-500">Envíanos un email a: Oficial@nayahcloset.com</span>
              </span>
            </a>

            <button
              type="button"
              @click="handleLogout"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-colors border-t border-black/5 text-left"
              role="menuitem"
            >
              <svg class="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M15 12H4m0 0 4-4m-4 4 4 4m6-12h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
              </svg>
              <span class="text-[14px] font-semibold text-primary">Cerrar sesión</span>
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Tabs -->
    <div class="mt-6 px-6 border-b border-black/20">
      <nav class="flex gap-8 -mb-px">
        <a
          v-for="tab in visibleTabs"
          :key="tab.id"
          :href="tab.href"
          :class="[
            'text-[15px] font-normal pb-3 transition-colors',
            props.activeTab === tab.id
              ? 'text-gray-900 border-b-2 border-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          ]"
        >
          {{ tab.label }}
        </a>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
