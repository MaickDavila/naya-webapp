import { reactive, computed } from 'vue';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  type User as FirebaseUser
} from 'firebase/auth';
import { app } from '../../lib/firebase';
import { FirestoreUserRepository } from '../../infrastructure/repositories/FirestoreUserRepository';
import { useShipping } from './shippingStore';

const auth = getAuth(app);
const userRepository = new FirestoreUserRepository();

const state = reactive({
  user: null as FirebaseUser | null,
  isInitialized: false,
  loading: true,
});

/**
 * Crea o actualiza el perfil del usuario en Firestore
 */
const ensureUserProfile = async (firebaseUser: FirebaseUser): Promise<void> => {
  try {
    await userRepository.getOrCreate(firebaseUser.uid, {
      name: firebaseUser.displayName || '',
      displayName: firebaseUser.displayName || '',
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL || undefined,
      createdAt: new Date(),
      rating: 0,
      reviewsCount: 0,
    });
  } catch (error) {
    console.error("Error ensuring user profile:", error);
  }
};

export const useAuth = () => {
  const user = computed(() => state.user);
  const isAuthenticated = computed(() => !!state.user);
  const loading = computed(() => state.loading);

  const initAuth = (): Promise<FirebaseUser | null> => {
    if (state.isInitialized) {
      return Promise.resolve(state.user);
    }

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        state.user = firebaseUser;
        state.loading = false;
        state.isInitialized = true;

        // Asegurar que el perfil existe en Firestore
        if (firebaseUser) {
          await ensureUserProfile(firebaseUser);
        }

        resolve(firebaseUser);
      });
    });
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    state.loading = true;
    try {
      const result = await signInWithPopup(auth, provider);
      
      // Crear perfil en Firestore si no existe
      await ensureUserProfile(result.user);
      
      return result.user;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    } finally {
      state.loading = false;
    }
  };

  const signOut = async () => {
    state.loading = true;
    try {
      await firebaseSignOut(auth);
      useShipping().reset();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      state.loading = false;
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    initAuth,
    signInWithGoogle,
    signOut
  };
};
