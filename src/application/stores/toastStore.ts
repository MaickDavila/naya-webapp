import { reactive, readonly } from "vue";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
}

const state = reactive<ToastState>({
  toasts: [],
});

let toastId = 0;

const addToast = (message: string, type: ToastType = "info", duration = 3000): string => {
  const id = `toast-${++toastId}`;

  state.toasts.push({
    id,
    message,
    type,
    duration,
  });

  // Auto-remove after duration
  setTimeout(() => {
    removeToast(id);
  }, duration);

  return id;
};

const removeToast = (id: string): void => {
  const index = state.toasts.findIndex((t) => t.id === id);
  if (index !== -1) {
    state.toasts.splice(index, 1);
  }
};

export const useToast = () => {
  const toasts = readonly(state.toasts);

  const success = (message: string, duration?: number) => addToast(message, "success", duration);
  const error = (message: string, duration?: number) => addToast(message, "error", duration);
  const info = (message: string, duration?: number) => addToast(message, "info", duration);
  const warning = (message: string, duration?: number) => addToast(message, "warning", duration);

  return {
    toasts,
    success,
    error,
    info,
    warning,
    remove: removeToast,
  };
};
