<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useFirestore, useCollection } from "vuefire";
import { collection, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "../../application/stores/authStore";
import { ProductMapper } from "../../infrastructure/mappers/ProductMapper";
import { COLLECTIONS } from "../../domain/constants/collections";
import type { Product, ProductStatus } from "../../domain/entities/Product";
import { CONDITION_LABELS } from "../../domain/entities/Product";
import ProductCard from "./ProductCard.vue";

const { user, initAuth } = useAuth();
const db = useFirestore();

// Estado para filtrar por estado (status combina moderación y lifecycle)
// pending = en revisión, approved = publicado, rejected = rechazado, sold = vendido
const statusFilter = ref<'all' | 'pending' | 'approved' | 'rejected' | 'sold'>('all');

// Query reactiva que se actualiza automáticamente cuando cambia el usuario
const productsQuery = computed(() =>
  user.value
    ? query(
        collection(db, COLLECTIONS.PRODUCTS),
        where("sellerId", "==", user.value.uid),
        orderBy("createdAt", "desc")
      )
    : null
);

// useCollection maneja automáticamente:
// - Suscripción/desuscripción
// - Estado de carga (pending)
// - Actualizaciones en tiempo real
// - Limpieza cuando el componente se desmonta
const { data: productsData, pending: loading } = useCollection(productsQuery, {
  wait: true, // Espera a que cargue antes de mostrar
});

// Mapear los datos de Firestore a entidades de dominio
const products = computed(() => {
  if (!productsData.value) return [];

  return productsData.value.map((doc: any) => {
    // vuefire devuelve documentos con id y datos
    return ProductMapper.toDomain(doc.id, doc);
  });
});

// Filtrar productos por estado
const filteredProducts = computed(() => {
  if (statusFilter.value === 'all') {
    return products.value;
  }
  return products.value.filter(product => 
    product.status === statusFilter.value
  );
});

// Contadores por estado
const productCounts = computed(() => ({
  total: products.value.length,
  pending: products.value.filter(p => p.status === 'pending').length,
  approved: products.value.filter(p => p.status === 'approved').length,
  rejected: products.value.filter(p => p.status === 'rejected').length,
  sold: products.value.filter(p => p.status === 'sold').length,
}));

onMounted(() => {
  initAuth();
});

// Funciones para gestión de productos
const getStatusBadge = (product: Product) => {
  switch (product.status) {
    case 'pending':
      return {
        class: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'En Revisión',
      };
    case 'approved':
      return {
        class: 'bg-green-100 text-green-800 border-green-200',
        label: 'Publicado',
      };
    case 'rejected':
      return {
        class: 'bg-red-100 text-red-800 border-red-200',
        label: 'Rechazado',
      };
    case 'sold':
      return {
        class: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Vendido',
      };
    case 'expired':
      return {
        class: 'bg-gray-100 text-gray-800 border-gray-200',
        label: 'Expirado',
      };
    case 'draft':
      return {
        class: 'bg-purple-100 text-purple-800 border-purple-200',
        label: 'Borrador',
      };
    default:
      return {
        class: 'bg-gray-100 text-gray-800 border-gray-200',
        label: 'Desconocido',
      };
  }
};

// Obtener etiqueta de condición del producto
const getConditionLabel = (condition: string | undefined) => {
  if (!condition) return 'No especificada';
  return CONDITION_LABELS[condition as keyof typeof CONDITION_LABELS] || condition;
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};
</script>

<template>
  <div class="flex flex-col gap-12">
    <!-- Header con contadores y filtros -->
    <div class="flex flex-col gap-4 border-b border-black/5 pb-6">
      <div class="flex items-end justify-between">
        <h1 class="text-4xl font-black text-gray-900 tracking-tight">
          Mis Productos
        </h1>
        <p
          v-if="!loading"
          class="text-sm font-bold text-primary-light uppercase tracking-widest"
        >
          {{ productCounts.total }} productos totales
        </p>
      </div>

      <!-- Contadores por estado -->
      <div v-if="!loading && products.length > 0" class="flex flex-wrap gap-4">
        <button
          @click="statusFilter = 'all'"
          class="flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all"
          :class="statusFilter === 'all' 
            ? 'border-primary bg-primary text-white' 
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
        >
          <span class="font-bold">Todos</span>
          <span class="px-2 py-1 bg-black/10 rounded-full text-xs">
            {{ productCounts.total }}
          </span>
        </button>

        <button
          @click="statusFilter = 'pending'"
          class="flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all"
          :class="statusFilter === 'pending' 
            ? 'border-yellow-400 bg-yellow-400 text-white' 
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
        >
          <span>En Revision</span>
          <span class="px-2 py-1 bg-black/10 rounded-full text-xs">
            {{ productCounts.pending }}
          </span>
        </button>

        <button
          @click="statusFilter = 'approved'"
          class="flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all"
          :class="statusFilter === 'approved' 
            ? 'border-green-400 bg-green-400 text-white' 
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
        >
          <span>Publicados</span>
          <span class="px-2 py-1 bg-black/10 rounded-full text-xs">
            {{ productCounts.approved }}
          </span>
        </button>

        <button
          @click="statusFilter = 'rejected'"
          class="flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all"
          :class="statusFilter === 'rejected' 
            ? 'border-red-400 bg-red-400 text-white' 
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
        >
          <span>Rechazados</span>
          <span class="px-2 py-1 bg-black/10 rounded-full text-xs">
            {{ productCounts.rejected }}
          </span>
        </button>

        <button
          v-if="productCounts.sold > 0"
          @click="statusFilter = 'sold'"
          class="flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all"
          :class="statusFilter === 'sold' 
            ? 'border-blue-400 bg-blue-400 text-white' 
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
        >
          <span>Vendidos</span>
          <span class="px-2 py-1 bg-black/10 rounded-full text-xs">
            {{ productCounts.sold }}
          </span>
        </button>
      </div>
    </div>

    <!-- Estado de Carga -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div
        class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"
      ></div>
      <p class="text-gray-400 font-medium italic">Recuperando tu armario...</p>
    </div>

    <!-- Estado Vacío -->
    <div
      v-else-if="filteredProducts.length === 0"
      class="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-black/5 text-center px-6"
    >
      <div
        class="w-20 h-20 bg-background-secondary rounded-[2rem] flex items-center justify-center mb-6"
      >
        <svg
          class="w-10 h-10 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </div>
      
      <h2 class="text-2xl font-black text-gray-900 mb-2">
        {{ products.length === 0 ? 'Tu armario está vacío' : 'No hay productos en esta categoría' }}
      </h2>
      <p class="text-gray-500 mb-8 max-w-xs leading-relaxed">
        {{ products.length === 0 
          ? '¿Tienes prendas que ya no usas? Dales una segunda vida y gana dinero.'
          : 'Prueba con otro filtro o agrega nuevos productos.'
        }}
      </p>
      <a
        href="/sell"
        class="bg-primary text-white px-8 py-4 rounded-[2rem] font-black text-lg hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center gap-2"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span>{{ products.length === 0 ? 'Empezar a vender' : 'Agregar nuevo producto' }}</span>
      </a>
    </div>

    <!-- Listado de Productos -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-700"
    >
      <div 
        v-for="product in filteredProducts" 
        :key="product.id" 
        class="relative group bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300"
      >
        <!-- Estado del producto -->
        <div class="absolute top-4 right-4 z-10">
          <div 
            class="px-3 py-1 rounded-full border text-xs font-bold"
            :class="getStatusBadge(product).class"
          >
            {{ getStatusBadge(product).label }}
          </div>
        </div>

        <!-- Imagen principal -->
        <div class="aspect-[4/3] overflow-hidden bg-gray-100">
          <img
            :src="product.images[0] || 'https://via.placeholder.com/400x300?text=NAYA'"
            :alt="product.title"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <!-- Información del producto -->
        <div class="p-6">
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1 mr-2">
              <h3 class="font-bold text-gray-900 text-lg mb-1 line-clamp-2">
                {{ product.title }}
              </h3>
              <p class="text-xs text-gray-500 uppercase tracking-widest">
                {{ product.category }}
                <span v-if="product.brand"> • {{ product.brand }}</span>
              </p>
            </div>
          </div>

          <!-- Precios -->
          <div class="flex items-baseline gap-2 mb-4">
            <span class="text-2xl font-black text-primary">
              ${{ product.price.toFixed(2) }}
            </span>
            <span 
              v-if="product.originalPrice && product.originalPrice > product.price"
              class="text-sm text-gray-400 line-through"
            >
              ${{ product.originalPrice.toFixed(2) }}
            </span>
          </div>

          <!-- Características del producto -->
          <div class="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <span v-if="product.size" class="px-2 py-1 bg-gray-100 rounded-full">
              Talla: {{ product.size }}
            </span>
            <span v-if="product.condition" class="px-2 py-1 bg-gray-100 rounded-full">
              {{ getConditionLabel(product.condition) }}
            </span>
          </div>

          <!-- Fecha y estadísticas -->
          <div class="flex justify-between items-center text-xs text-gray-400 mb-4">
            <span>Creado: {{ formatDate(product.createdAt) }}</span>
            <span v-if="product.status === 'approved'" class="flex items-center gap-3">
              <span class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {{ product.views || 0 }}
              </span>
              <span class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {{ product.favorites || 0 }}
              </span>
            </span>
          </div>

          <!-- Acciones -->
          <div class="flex gap-2">
            <a
              v-if="product.status !== 'sold'"
              :href="`/edit-product/${product.id}`"
              class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Editar
            </a>
            
            <a
              v-if="product.status === 'rejected'"
              :href="`/edit-product/${product.id}`"
              class="flex-1 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Corregir y reenviar
            </a>

            <a
              v-if="product.status === 'approved'"
              :href="`/products/${product.id}`"
              class="flex-1 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Ver
            </a>
          </div>

          <!-- Mensaje de rechazo -->
          <div 
            v-if="product.status === 'rejected' && product.moderationNotes"
            class="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl"
          >
            <p class="text-xs text-red-700">
              <strong>Motivo del rechazo:</strong> {{ product.moderationNotes }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
