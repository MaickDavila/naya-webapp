import { reactive, computed, onMounted } from 'vue';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  type User as FirebaseUser
} from 'firebase/auth';
import { app } from '../../lib/firebase';

const auth = getAuth(app);

const state = reactive({
  user: null as FirebaseUser | null,
  isInitialized: false,
  loading: true,
});

export const useAuth = () => {
  const user = computed(() => state.user);
  const isAuthenticated = computed(() => !!state.user);
  const loading = computed(() => state.loading);

  const initAuth = () => {
    if (state.isInitialized) return;
    
    onAuthStateChanged(auth, (firebaseUser) => {
      state.user = firebaseUser;
      state.loading = false;
      state.isInitialized = true;
    });
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    state.loading = true;
    try {
      const result = await signInWithPopup(auth, provider);
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
