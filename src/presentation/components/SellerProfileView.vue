<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { User } from "../../domain/entities/User";
import type { Product } from "../../domain/entities/Product";
import type { Review } from "../../domain/entities/Review";
import ProductCard from "./ProductCard.vue";
import { formatDateLong } from "../utils/formatters";
import { useAuth } from "../../application/stores/authStore";
import { FirestoreUserRepository } from "../../infrastructure/repositories/FirestoreUserRepository";
import { FirestoreReviewRepository } from "../../infrastructure/repositories/FirestoreReviewRepository";
import { CreateReview } from "../../application/use-cases/CreateReview";

interface Props {
  seller: User;
  products: Product[];
  reviews?: Review[];
}

const props = withDefaults(defineProps<Props>(), {
  reviews: () => [],
});

const { user, initAuth } = useAuth();
const userRepo = new FirestoreUserRepository();
const reviewRepo = new FirestoreReviewRepository();
const createReviewUseCase = new CreateReview(reviewRepo);

const failedReviewImages = ref<Set<string>>(new Set());
const markImageFailed = (reviewId: string) => {
  failedReviewImages.value = new Set([...failedReviewImages.value, reviewId]);
};
const showReviewPhoto = (review: Review) =>
  review.reviewerPhotoURL && !failedReviewImages.value.has(review.id);

const reviewsList = ref<Review[]>(props.reviews);
const existingReview = ref<Review | null>(null);
const loadingReviews = ref(false);
const submittingReview = ref(false);
const reviewForm = ref({ rating: 0, hoverRating: 0, comment: "" });

type TabType = "for_sale" | "reviews";
const activeTab = ref<TabType>("for_sale");

const tabs = [
  { key: "for_sale" as TabType, label: "FOR SALE" },
  { key: "reviews" as TabType, label: "REVIEWS" },
];

const canAddReview = computed(
  () =>
    user.value &&
    user.value.uid !== props.seller.id &&
    !existingReview.value
);

const loadReviews = async () => {
  loadingReviews.value = true;
  try {
    reviewsList.value = await reviewRepo.getByReviewedUserId(props.seller.id);
  } finally {
    loadingReviews.value = false;
  }
};

const loadExistingReview = async () => {
  if (!user.value) return;
  existingReview.value = await reviewRepo.getByReviewerAndReviewedUser(
    user.value.uid,
    props.seller.id
  );
};

const renderStars = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(i <= rating);
  }
  return stars;
};

const displayRating = computed(
  () => reviewForm.value.hoverRating || reviewForm.value.rating
);

const setRating = (r: number) => {
  reviewForm.value.rating = r;
};

const submitReview = async () => {
  if (!user.value || reviewForm.value.rating < 1) return;
  submittingReview.value = true;
  try {
    let reviewerPhotoURL: string | undefined = user.value.photoURL || undefined;
    const userProfile = await userRepo.getById(user.value.uid);
    if (userProfile?.photoURL) {
      reviewerPhotoURL = userProfile.photoURL;
    }
    await createReviewUseCase.execute({
      reviewerId: user.value.uid,
      reviewerName: user.value.displayName || userProfile?.displayName || userProfile?.name || user.value.email?.split("@")[0] || "Usuario",
      reviewerPhotoURL,
      reviewedUserId: props.seller.id,
      reviewedUserName: props.seller.displayName || props.seller.name || "Vendedor",
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment || null,
    });
    await loadReviews();
    await loadExistingReview();
    reviewForm.value = { rating: 0, hoverRating: 0, comment: "" };
  } finally {
    submittingReview.value = false;
  }
};

onMounted(async () => {
  await initAuth();
  await loadReviews();
  await loadExistingReview();
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Header del Perfil -->
    <div class="flex items-start gap-4">
      <!-- Avatar cuadrado -->
      <div
        class="w-24 h-24 rounded-[15px] bg-gray-100 flex items-center justify-center text-white text-3xl font-black flex-shrink-0 overflow-hidden"
      >
        <img
          v-if="seller.photoURL"
          :src="seller.photoURL"
          :alt="seller.displayName"
          class="w-full h-full object-cover"
        />
        <span
          v-else
          class="bg-primary w-full h-full flex items-center justify-center"
        >
          {{ seller.displayName?.charAt(0).toUpperCase() }}
        </span>
      </div>

      <div class="flex-1 min-w-0">
        <p class="text-[15px] text-black">
          @{{ seller.displayName?.replace(/\s+/g, "").toLowerCase() }}
        </p>
        <p class="text-[15px] font-bold text-black">
          {{ seller.displayName }}
        </p>
        <p class="text-[15px] text-black leading-snug mt-1">
          {{
            seller.biography ||
            "Este vendedor aún no ha añadido una biografía."
          }}
        </p>
        <a
          v-if="seller.instagram"
          :href="`https://instagram.com/${seller.instagram.replace(/^@/, '')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[15px] text-black font-normal mt-1 block hover:underline"
        >
          Instagram:
          {{ seller.instagram.startsWith("@") ? seller.instagram : `@${seller.instagram}` }}
        </a>
      </div>
    </div>

    <!-- Tabs FOR SALE | REVIEWS -->
    <div class="flex flex-col">
      <div class="flex gap-6 border-b border-black/20">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="[
            'pb-3 text-[15px] font-bold transition-colors',
            activeTab === tab.key
              ? 'text-black border-b-2 border-black'
              : 'text-black/50',
          ]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Contenido FOR SALE -->
      <div v-show="activeTab === 'for_sale'" class="pt-4">
        <div
          v-if="products.length === 0"
          class="text-center py-12"
        >
          <p class="text-gray-400 font-medium">
            Este vendedor no tiene productos activos actualmente.
          </p>
        </div>

        <div
          v-else
          class="grid grid-cols-3 gap-2"
        >
          <ProductCard
            v-for="product in products"
            :key="product.id"
            :product="product"
          />
        </div>
      </div>

      <!-- Contenido REVIEWS -->
      <div v-show="activeTab === 'reviews'" class="pt-4">
        <!-- Formulario de reseña (solo usuarios logueados que no sean el vendedor) -->
        <div
          v-if="canAddReview"
          class="mb-6 p-4 rounded-2xl bg-gray-50 border border-black/5"
        >
          <p class="text-sm font-bold text-black mb-3">Dejar reseña</p>
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-1">
              <button
                v-for="i in 5"
                :key="i"
                type="button"
                class="p-1 transition-colors"
                @click="setRating(i)"
                @mouseenter="reviewForm.hoverRating = i"
                @mouseleave="reviewForm.hoverRating = 0"
              >
                <svg
                  class="w-12 h-12"
                  :class="
                    i <= displayRating
                      ? 'text-amber-400'
                      : 'text-gray-200'
                  "
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
              </button>
            </div>
            <textarea
              v-model="reviewForm.comment"
              rows="3"
              placeholder="Escribe tu reseña..."
              class="w-full rounded-xl border border-black/10 px-4 py-3 text-[15px] focus:border-primary/20 focus:ring-0 focus:outline-none resize-none"
            />
            <button
              type="button"
              :disabled="submittingReview || reviewForm.rating < 1"
              class="self-start px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              @click="submitReview"
            >
              {{ submittingReview ? "Enviando..." : "Enviar reseña" }}
            </button>
          </div>
        </div>

        <!-- Mensaje si no está logueado (solo en tab reviews) -->
        <div
          v-else-if="!user"
          class="mb-6 p-4 rounded-2xl bg-gray-50 border border-black/5"
        >
          <p class="text-sm text-black/70">
            <a href="/login" class="font-bold text-primary hover:underline">Inicia sesión</a>
            para dejar una reseña a este vendedor.
          </p>
        </div>

        <div
          v-if="loadingReviews"
          class="text-center py-8"
        >
          <div class="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
        </div>

        <div
          v-else-if="reviewsList.length === 0"
          class="text-center py-12"
        >
          <p class="text-gray-400 font-medium">
            Este vendedor aún no tiene reseñas.
          </p>
        </div>

        <div
          v-else
          class="flex flex-col gap-6"
        >
          <article
            v-for="review in reviewsList"
            :key="review.id"
            class="flex gap-4"
          >
            <!-- Avatar del revisor -->
            <div
              class="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center relative"
            >
              <img
                v-if="showReviewPhoto(review)"
                :src="review.reviewerPhotoURL!"
                :alt="review.reviewerName"
                class="w-full h-full object-cover"
                @error="markImageFailed(review.id)"
              />
              <span
                v-show="!showReviewPhoto(review)"
                class="w-full h-full bg-primary flex items-center justify-center text-white font-bold text-sm absolute inset-0"
              >
                {{ review.reviewerName?.charAt(0).toUpperCase() || "?" }}
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <p class="text-[15px] font-bold text-black">
                {{ review.reviewerName }}
              </p>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <div class="flex gap-0.5">
                  <svg
                    v-for="(filled, i) in renderStars(review.rating)"
                    :key="i"
                    class="w-4 h-4"
                    :class="filled ? 'text-amber-400' : 'text-gray-200'"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                    />
                  </svg>
                </div>
                <span class="text-[13px] text-black/50">
                  {{ formatDateLong(review.createdAt) }}
                </span>
              </div>
              <p
                v-if="review.comment"
                class="text-[15px] text-black mt-2 leading-snug"
              >
                {{ review.comment }}
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>
