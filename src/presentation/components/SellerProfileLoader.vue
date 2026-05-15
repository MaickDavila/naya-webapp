<script setup lang="ts">
import { ref, onMounted } from "vue";
import { FirestoreUserRepository } from "../../infrastructure/repositories/FirestoreUserRepository";
import { FirestoreProductRepository } from "../../infrastructure/repositories/FirestoreProductRepository";
import { FirestoreReviewRepository } from "../../infrastructure/repositories/FirestoreReviewRepository";
import type { User } from "../../domain/entities/User";
import type { Product } from "../../domain/entities/Product";
import type { Review } from "../../domain/entities/Review";
import SellerProfileView from "./SellerProfileView.vue";

const props = defineProps<{ id: string }>();

const userRepo = new FirestoreUserRepository();
const productRepo = new FirestoreProductRepository();
const reviewRepo = new FirestoreReviewRepository();

const isLoading = ref(true);
const seller = ref<User | null>(null);
const products = ref<Product[]>([]);
const reviews = ref<Review[]>([]);

onMounted(async () => {
  try {
    seller.value = await userRepo.getById(props.id);
    if (seller.value) {
      const [allProducts, sellerReviews] = await Promise.all([
        productRepo.getBySellerId(props.id),
        reviewRepo.getByReviewedUserId(props.id),
      ]);
      products.value = allProducts.filter((p) => p.status === "approved");
      reviews.value = sellerReviews;
    }
  } catch (e) {
    console.error("Error loading seller profile:", e);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div v-if="isLoading" class="space-y-6">
    <div class="flex items-center gap-4">
      <div class="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
      <div class="h-6 w-40 bg-gray-200 rounded animate-pulse" />
    </div>
    <div class="grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
      <div
        v-for="n in 6"
        :key="n"
        class="w-full bg-gray-200 rounded-2xl animate-pulse"
        style="aspect-ratio: 3/4;"
      />
    </div>
  </div>

  <div v-else-if="!seller" class="text-center py-16 lg:py-24">
    <h1 class="text-2xl lg:text-3xl font-black text-gray-900 mb-2">
      Vendedor no encontrado
    </h1>
    <p class="text-gray-500 lg:text-lg">
      El perfil que buscas no existe.
    </p>
  </div>

  <SellerProfileView
    v-else
    :seller="seller"
    :products="products"
    :reviews="reviews"
  />
</template>
