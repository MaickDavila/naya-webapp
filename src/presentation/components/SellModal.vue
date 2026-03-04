<script setup lang="ts">
import { ref } from "vue";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLLECTIONS } from "../../domain/constants/collections";
import { useToast } from "../../application/stores/toastStore";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { success, error: showError } = useToast();
const submitting = ref(false);
const form = ref({
  name: "",
  email: "",
  instagram: "",
});

const close = () => emit("close");

const submit = async () => {
  const name = form.value.name.trim();
  const email = form.value.email.trim();
  if (!name || !email) return;

  submitting.value = true;
  try {
    await addDoc(collection(db, COLLECTIONS.SELLER_APPLICATIONS), {
      name,
      email,
      instagram: form.value.instagram.trim() || null,
      createdAt: serverTimestamp(),
    });
    success("Gracias. Nos pondremos en contacto contigo pronto.");
    form.value = { name: "", email: "", instagram: "" };
    close();
  } catch (e) {
    console.error("Error al enviar solicitud:", e);
    showError("Hubo un error. Intenta de nuevo.");
  } finally {
    submitting.value = false;
  }
};

const handleBackdropClick = (e: MouseEvent) => {
  if ((e.target as HTMLElement).dataset.backdrop) close();
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        data-backdrop
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
        @click="handleBackdropClick"
      >
        <!-- Diseño según sellmodal.pen: fondo #dad1c8, 301px ancho -->
        <div
          class="bg-[#dad1c8] w-[301px] max-h-[90vh] overflow-y-auto shadow-xl"
          @click.stop
        >
          <div class="px-8 py-6 relative">
            <!-- Botón cerrar: "+" rotado -44° como en el diseño -->
            <button
              type="button"
              class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-black hover:opacity-70 transition-opacity"
              aria-label="Cerrar"
              @click="close"
            >
              <span class="text-[35px] leading-none" style="transform: rotate(-44deg)">+</span>
            </button>

            <!-- Título: 15px, centrado -->
            <h2 class="text-[15px] font-normal text-black text-center mb-5 pr-6">
              QUIERES VENDER CON NOSOTROS?
            </h2>

            <!-- Texto: 12px, centrado -->
            <p class="text-[12px] text-black text-center mb-8 leading-relaxed">
              De momento, para mantener la calidad de los productos que ofrecemos y nuestro
              servicio, estamos limitando los perfiles que pueden vender ropa.
              <br /><br />
              Rellena tu información y nos pondremos en contacto.
            </p>

            <form @submit.prevent="submit" class="flex flex-col gap-5">
              <!-- Nombre: label 12px, input 40px altura, border #cbcbcb, rounded 7px -->
              <div>
                <label class="block text-[12px] font-normal text-black mb-2">
                  Nombre *
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="Nombre y apellido"
                  required
                  class="w-full h-10 rounded-[7px] border border-[#cbcbcb] bg-white px-3 text-[12px] placeholder:text-[#cbcbcb] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label class="block text-[12px] font-normal text-black mb-2">
                  Email*
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  placeholder="Te estaremos contactando"
                  required
                  class="w-full h-10 rounded-[7px] border border-[#cbcbcb] bg-white px-3 text-[12px] placeholder:text-[#cbcbcb] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label class="block text-[12px] font-normal text-black mb-2">
                  Instagram
                </label>
                <input
                  v-model="form.instagram"
                  type="text"
                  placeholder="Déjanos conocerte mejor!"
                  class="w-full h-10 rounded-[7px] border border-[#cbcbcb] bg-white px-3 text-[12px] placeholder:text-[#cbcbcb] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <!-- Botón: #6c1d2a, rounded 15px, h 41px, texto 15px font-bold 700 -->
              <button
                type="submit"
                :disabled="submitting"
                class="w-full h-[41px] rounded-[15px] bg-[#6c1d2a] text-white text-[15px] font-bold transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
              >
                {{ submitting ? "Enviando..." : "Enviar" }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
