<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useFirestore, useCollection } from "vuefire";
import { collection, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "../../application/stores/authStore";
import { COLLECTIONS } from "../../domain/constants/collections";
import type {
  Transaction,
  TransactionStatus,
} from "../../domain/entities/Transaction";
import { formatPrice } from "../utils/formatters";
import ProfileHeader from "./ProfileHeader.vue";

const { user, initAuth } = useAuth();
const db = useFirestore();

// Estado para filtrar por estado
const statusFilter = ref<"all" | TransactionStatus>("all");

// Query reactiva que se actualiza automáticamente cuando cambia el usuario
const transactionsQuery = computed(() =>
  user.value
    ? query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        where("buyerId", "==", user.value.uid),
        orderBy("createdAt", "desc"),
      )
    : null,
);

// useCollection maneja automáticamente la suscripción y actualizaciones en tiempo real
const { data: transactionsData, pending: loading } = useCollection(
  transactionsQuery,
  {
    wait: true,
  },
);

// Mapear los datos de Firestore a entidades de dominio
const transactions = computed(() => {
  if (!transactionsData.value) return [];

  return transactionsData.value.map((doc: any) => {
    const data = doc;
    return {
      id: doc.id,
      productId: data.productId || "",
      productName: data.productName || "",
      productImage: data.productImage || null,
      buyerId: data.buyerId || "",
      buyerName: data.buyerName || "",
      buyerEmail: data.buyerEmail || "",
      sellerId: data.sellerId || "",
      sellerName: data.sellerName || "",
      sellerEmail: data.sellerEmail || "",
      amount: data.amount || 0,
      currency: data.currency || "PEN",
      commission: data.commission || 0,
      sellerAmount: data.sellerAmount || 0,
      status: (data.status || "pending") as TransactionStatus,
      paymentMethod: data.paymentMethod || "mercadopago",
      paymentId: data.paymentId || "",
      paymentProvider: data.paymentProvider || "mercadopago",
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate
        ? data.updatedAt.toDate()
        : new Date(data.updatedAt),
      completedAt: data.completedAt?.toDate
        ? data.completedAt.toDate()
        : data.completedAt
          ? new Date(data.completedAt)
          : undefined,
      cancelledAt: data.cancelledAt?.toDate
        ? data.cancelledAt.toDate()
        : data.cancelledAt
          ? new Date(data.cancelledAt)
          : undefined,
      refundedAt: data.refundedAt?.toDate
        ? data.refundedAt.toDate()
        : data.refundedAt
          ? new Date(data.refundedAt)
          : undefined,
      notes: data.notes || null,
    } as Transaction;
  });
});

// Filtrar transacciones por estado
const filteredTransactions = computed(() => {
  if (statusFilter.value === "all") {
    return transactions.value;
  }
  return transactions.value.filter((t) => t.status === statusFilter.value);
});

// Formatear fecha
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// Obtener badge de estado
const getStatusBadge = (status: TransactionStatus) => {
  const badges = {
    pending: {
      label: "Pendiente",
      class: "bg-amber-50 text-amber-700 border-amber-200",
    },
    completed: {
      label: "Completada",
      class: "bg-success/10 text-success border-success/20",
    },
    cancelled: {
      label: "Cancelada",
      class: "bg-gray-100 text-gray-600 border-gray-200",
    },
    refunded: {
      label: "Reembolsada",
      class: "bg-red-50 text-red-700 border-red-200",
    },
    disputed: {
      label: "En Disputa",
      class: "bg-orange-50 text-orange-700 border-orange-200",
    },
  };
  return badges[status] || badges.pending;
};

onMounted(() => {
  initAuth();
});
</script>

<template>
  <div v-if="user" class="flex flex-col gap-8">
    <ProfileHeader active-tab="purchases" />

    <!-- Filtros -->
    <div class="mb-6 flex gap-2 flex-wrap">
      <button
        @click="statusFilter = 'all'"
        :class="[
          'px-4 py-2 rounded-xl font-bold text-sm transition-all',
          statusFilter === 'all'
            ? 'bg-primary text-white'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
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
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
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
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
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
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
        ]"
      >
        Canceladas
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div
        class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
      ></div>
      <p class="mt-4 text-gray-500">Cargando tus compras...</p>
    </div>

    <!-- Sin transacciones -->
    <div
      v-else-if="filteredTransactions.length === 0"
      class="text-center py-16"
    >
      <div
        class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <svg
          class="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      </div>
      <h3 class="text-xl font-bold text-gray-900 mb-2">
        {{
          statusFilter === "all"
            ? "Aún no tienes compras"
            : `No hay compras ${getStatusBadge(statusFilter).label.toLowerCase()}`
        }}
      </h3>
      <p class="text-gray-500 mb-6">
        {{
          statusFilter === "all"
            ? "Cuando realices una compra, aparecerá aquí"
            : "No tienes compras con este estado"
        }}
      </p>
      <a
        v-if="statusFilter === 'all'"
        href="/"
        class="inline-block bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-dark transition-all"
      >
        Buscar productos
      </a>
    </div>

    <!-- Lista de transacciones - Estilo perfil.pen -->
    <div v-else class="space-y-6">
      <div
        v-for="transaction in filteredTransactions"
        :key="transaction.id"
        class="flex gap-4"
      >
        <!-- Imagen del producto -->
        <a
          :href="`/products/${transaction.productId}`"
          class="flex-shrink-0 w-[125px] h-[155px] rounded-lg overflow-hidden bg-gray-100"
        >
          <img
            v-if="transaction.productImage"
            :src="transaction.productImage"
            :alt="transaction.productName"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center text-gray-400"
          >
            <svg
              class="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </a>

        <!-- Información -->
        <div class="flex-1 min-w-0 flex flex-col">
          <h3 class="text-sm font-bold text-gray-900 truncate">
            {{ transaction.productName }}
          </h3>
          <p class="text-sm font-bold text-gray-900">
            {{ transaction.sellerName }}
          </p>
          <p class="text-sm text-gray-900 mt-1">
            {{ formatPrice(transaction.amount) }}
          </p>
          <div
            :class="[
              'mt-2 px-3 py-1 rounded-full border text-xs font-bold w-fit',
              getStatusBadge(transaction.status).class,
            ]"
          >
            {{ getStatusBadge(transaction.status).label }}
          </div>
          <div class="mt-auto pt-4 flex gap-2">
            <a
              :href="`/products/${transaction.productId}`"
              class="px-4 py-2 bg-primary text-white rounded-[15px] font-bold text-xs hover:bg-primary-dark transition-all shadow-md"
            >
              Ver producto
            </a>
            <a
              v-if="transaction.sellerId"
              :href="`/sellers/${transaction.sellerId}`"
              class="px-4 py-2 bg-white text-primary border border-primary/30 rounded-[15px] font-bold text-xs hover:bg-primary/5 transition-all"
            >
              Ver vendedor
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
