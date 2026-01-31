<script setup lang="ts">
import { computed } from "vue";
import { useToast, type Toast } from "../../application/stores/toastStore";

const { toasts, remove } = useToast();

const toastList = computed(() => toasts as unknown as Toast[]);

const getIcon = (type: Toast["type"]) => {
  switch (type) {
    case "success":
      return "M5 13l4 4L19 7";
    case "error":
      return "M6 18L18 6M6 6l12 12";
    case "warning":
      return "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
    case "info":
    default:
      return "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
  }
};

const getColors = (type: Toast["type"]) => {
  switch (type) {
    case "success":
      return "bg-success text-white";
    case "error":
      return "bg-error text-white";
    case "warning":
      return "bg-warning text-white";
    case "info":
    default:
      return "bg-primary text-white";
  }
};
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-24 left-0 right-0 z-[9999] flex flex-col items-center gap-3 px-4 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastList"
          :key="toast.id"
          :class="[
            'flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl pointer-events-auto cursor-pointer',
            'min-w-[200px] max-w-[90vw] md:max-w-md',
            getColors(toast.type)
          ]"
          @click="remove(toast.id)"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getIcon(toast.type)" />
          </svg>
          <span class="font-medium text-sm">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  animation: toast-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in forwards;
}

.toast-move {
  transition: transform 0.3s ease;
}

@keyframes toast-in {
  0% {
    opacity: 0;
    transform: translateY(100%) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toast-out {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px) scale(0.9);
  }
}
</style>
