import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Configuración de Firebase del lado del cliente
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

// Inicializar SDK (Funciona tanto en cliente como en servidor/SSR con el Client SDK)
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Configurar Firestore con persistencia offline (solo en el cliente)
let db: Firestore;
if (typeof window !== "undefined") {
  // En el cliente: habilitar persistencia offline con IndexedDB
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        // Sincronización entre múltiples pestañas
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error: any) {
    // Si falla (ej: múltiples pestañas, browser no compatible), usar sin persistencia
    console.warn("No se pudo habilitar persistencia offline:", error);
    db = getFirestore(app);
  }
} else {
  // En el servidor (SSR): sin persistencia
  db = getFirestore(app);
}

const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);

export { app, db, auth, storage };
