<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useFirestore, useCollection } from 'vuefire';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../../application/stores/authStore';
import { COLLECTIONS } from '../../domain/constants/collections';
import type { Transaction, TransactionStatus } from '../../domain/entities/Transaction';
import { formatPrice } from '../utils/formatters';

const { user, initAuth } = useAuth();
const db = useFirestore();

// Estado para filtrar por estado
const statusFilter = ref<'all' | TransactionStatus>('all');

// Query reactiva que se actualiza automáticamente cuando cambia el usuario
const transactionsQuery = computed(() =>
  user.value
    ? query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        where('buyerId', '==', user.value.uid),
        orderBy('createdAt', 'desc')
      )
    : null
);

// useCollection maneja automáticamente la suscripción y actualizaciones en tiempo real
const { data: transactionsData, pending: loading } = useCollection(transactionsQuery, {
  wait: true,
});

// Mapear los datos de Firestore a entidades de dominio
const transactions = computed(() => {
  if (!transactionsData.value) return [];

  return transactionsData.value.map((doc: any) => {
    const data = doc;
    return {
      id: doc.id,
      productId: data.productId || '',
      productName: data.productName || '',
      productImage: data.productImage || null,
      buyerId: data.buyerId || '',
      buyerName: data.buyerName || '',
      buyerEmail: data.buyerEmail || '',
      sellerId: data.sellerId || '',
      sellerName: data.sellerName || '',
      sellerEmail: data.sellerEmail || '',
      amount: data.amount || 0,
      currency: data.currency || 'PEN',
      commission: data.commission || 0,
      sellerAmount: data.sellerAmount || 0,
      status: (data.status || 'pending') as TransactionStatus,
      paymentMethod: data.paymentMethod || 'mercadopago',
      paymentId: data.paymentId || '',
      paymentProvider: data.paymentProvider || 'mercadopago',
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : undefined),
      cancelledAt: data.cancelledAt?.toDate ? data.cancelledAt.toDate() : (data.cancelledAt ? new Date(data.cancelledAt) : undefined),
      refundedAt: data.refundedAt?.toDate ? data.refundedAt.toDate() : (data.refundedAt ? new Date(data.refundedAt) : undefined),
      notes: data.notes || null,
    } as Transaction;
  });
});

// Filtrar transacciones por estado
const filteredTransactions = computed(() => {
  if (statusFilter.value === 'all') {
    return transactions.value;
  }
  return transactions.value.filter(t => t.status === statusFilter.value);
});

// Formatear fecha
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Obtener badge de estado
const getStatusBadge = (status: TransactionStatus) => {
  const badges = {
    pending: { label: 'Pendiente', class: 'bg-amber-50 text-amber-700 border-amber-200' },
    completed: { label: 'Completada', class: 'bg-success/10 text-success border-success/20' },
    cancelled: { label: 'Cancelada', class: 'bg-gray-100 text-gray-600 border-gray-200' },
    refunded: { label: 'Reembolsada', class: 'bg-red-50 text-red-700 border-red-200' },
    disputed: { label: 'En Disputa', class: 'bg-orange-50 text-orange-700 border-orange-200' },
  };
  return badges[status] || badges.pending;
};

onMounted(() => {
  initAuth();
});
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-black text-gray-900 mb-2">Mis Compras</h1>
      <p class="text-gray-600">Revisa el estado de tus pedidos y tus tesoros adquiridos</p>
    </div>

    <!-- Filtros -->
    <div class="mb-6 flex gap-2 flex-wrap">
      <button
        @click="statusFilter = 'all'"
        :class="[
          'px-4 py-2 rounded-xl font-bold text-sm transition-all',
          statusFilter === 'all'
            ? 'bg-primary text-white'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        ]"
      >
        Todas
      </button>
      <button
        @click="statusFilter = 'pending'"
        :class="[
          'px-4 py-2 rounded-xl font-bold text-sm transition-all',
          statusFilter === 'pending'
            ? 'bg-primary text-white'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        ]"
      >
        Pendientes
      </button>
      <button
        @click="statusFilter = 'completed'"
        :class="[
          'px-4 py-2 rounded-xl font-bold text-sm transition-all',
          statusFilter === 'completed'
            ? 'bg-primary text-white'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        ]"
      >
        Completadas
      </button>
      <button
        @click="statusFilter = 'cancelled'"
        :class="[
          'px-4 py-2 rounded-xl font-bold text-sm transition-all',
          statusFilter === 'cancelled'
            ? 'bg-primary text-white'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        ]"
      >
        Canceladas
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-gray-500">Cargando tus compras...</p>
    </div>

    <!-- Sin transacciones -->
    <div v-else-if="filteredTransactions.length === 0" class="text-center py-16">
      <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <h3 class="text-xl font-bold text-gray-900 mb-2">
        {{ statusFilter === 'all' ? 'Aún no tienes compras' : `No hay compras ${getStatusBadge(statusFilter).label.toLowerCase()}` }}
      </h3>
      <p class="text-gray-500 mb-6">
        {{ statusFilter === 'all' ? 'Cuando realices una compra, aparecerá aquí' : 'No tienes compras con este estado' }}
      </p>
      <a
        v-if="statusFilter === 'all'"
        href="/"
        class="inline-block bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-dark transition-all"
      >
        Explorar productos
      </a>
    </div>

    <!-- Lista de transacciones -->
    <div v-else class="space-y-4">
      <div
        v-for="transaction in filteredTransactions"
        :key="transaction.id"
        class="bg-white rounded-[2rem] p-6 shadow-sm border border-black/5 hover:shadow-md transition-all"
      >
        <div class="flex flex-col md:flex-row gap-6">
          <!-- Imagen del producto -->
          <div class="w-full md:w-32 h-32 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
            <img
              v-if="transaction.productImage"
              :src="transaction.productImage"
              :alt="transaction.productName"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
              <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <!-- Información -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1 min-w-0">
                <h3 class="text-xl font-black text-gray-900 mb-2 truncate">
                  {{ transaction.productName }}
                </h3>
                <p class="text-sm text-gray-500 mb-1">
                  Vendido por <span class="font-bold">{{ transaction.sellerName }}</span>
                </p>
                <p class="text-xs text-gray-400">
                  {{ formatDate(transaction.createdAt) }}
                </p>
              </div>
              <div
                :class="[
                  'px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap',
                  getStatusBadge(transaction.status).class
                ]"
              >
                {{ getStatusBadge(transaction.status).label }}
              </div>
            </div>

            <!-- Detalles -->
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p class="text-xs text-gray-500 mb-1">Monto</p>
                <p class="text-lg font-black text-gray-900">
                  {{ formatPrice(transaction.amount) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Método de pago</p>
                <p class="text-sm font-bold text-gray-700 capitalize">
                  {{ transaction.paymentMethod === 'mercadopago' ? 'Mercado Pago' : transaction.paymentMethod }}
                </p>
              </div>
            </div>

            <!-- Acciones -->
            <div class="flex gap-3">
              <a
                :href="`/products/${transaction.productId}`"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
              >
                Ver producto
              </a>
              <a
                v-if="transaction.sellerId"
                :href="`/sellers/${transaction.sellerId}`"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
              >
                Ver vendedor
              </a>
            </div>

            <!-- Notas adicionales -->
            <div v-if="transaction.notes" class="mt-4 p-3 bg-gray-50 rounded-xl">
              <p class="text-xs text-gray-600">
                <strong>Nota:</strong> {{ transaction.notes }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
