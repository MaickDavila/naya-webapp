<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useFirestore, useDocument } from 'vuefire';
import { doc } from 'firebase/firestore';
import { useAuth } from '../../application/stores/authStore';
import { COLLECTIONS } from '../../domain/constants/collections';

type ProfileTab = 'for-sale' | 'purchases' | 'addresses';

interface Props {
  activeTab: ProfileTab;
}

const props = defineProps<Props>();

const { user, initAuth } = useAuth();
const db = useFirestore();

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

onMounted(() => {
  initAuth();
});
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

      <!-- Settings icon -->
      <a
        href="/edit-profile"
        class="p-2 -mb-1 hover:bg-black/5 rounded-full transition-colors flex-shrink-0"
        aria-label="Editar perfil"
      >
        <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </a>
    </div>

    <!-- Tabs -->
    <div class="mt-6 px-6 border-b border-black/20">
      <nav class="flex gap-8 -mb-px">
        <a
          v-for="tab in tabs"
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
