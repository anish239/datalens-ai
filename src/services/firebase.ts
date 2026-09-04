import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'datalens-ai-cfee4';
export const FIREBASE_AUTH_DOMAIN = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${FIREBASE_PROJECT_ID}.firebaseapp.com`;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

if (!isFirebaseConfigured) {
  console.info(
    `[DataLens AI] Initializing Firebase with project ID: ${FIREBASE_PROJECT_ID} and authDomain: ${FIREBASE_AUTH_DOMAIN}. (VITE_FIREBASE_API_KEY is ${firebaseConfig.apiKey ? 'provided' : 'pending in .env'}).`
  );
}

// Initialize Firebase safely
const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(
      isFirebaseConfigured
        ? firebaseConfig
        : {
            apiKey: firebaseConfig.apiKey || 'mock-key-for-initialization',
            authDomain: FIREBASE_AUTH_DOMAIN,
            projectId: FIREBASE_PROJECT_ID,
            storageBucket: firebaseConfig.storageBucket || `${FIREBASE_PROJECT_ID}.appspot.com`,
            appId: firebaseConfig.appId || '1:000000000000:web:000000000000',
          }
    );

export const auth = getAuth(app);
export const db = getFirestore(app);

// Firebase Storage is initialized safely when available
let storageInstance: any = null;
try {
  if (firebaseConfig.storageBucket) {
    storageInstance = getStorage(app);
  }
} catch (e) {
  // Storage initialization safely deferred
}
export const storage = storageInstance;
export default app;

