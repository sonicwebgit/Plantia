import { initializeApp } from 'firebase/app';
import { getAuth as getFirebaseAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, enableIndexedDbPersistence, Firestore } from 'firebase/firestore';


const firebaseConfig = {
  // Use import.meta.env for client-side variables, which is the standard for Vite/modern web apps.
  // This ensures variables are correctly bundled and available in the browser.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let appInitialized = false;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

function initializeFirebase() {
    if (appInitialized) return;

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error("Firebase environment variables are missing. Please ensure you have the correct VITE_FIREBASE_* keys configured for your deployment.");
    }

    const app = initializeApp(firebaseConfig);
    authInstance = getFirebaseAuth(app);
    firestoreInstance = getFirestore(app);
    
    try {
        enableIndexedDbPersistence(firestoreInstance)
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn("Firestore persistence failed: Multiple tabs open.");
                } else if (err.code === 'unimplemented') {
                    console.warn("Firestore persistence not available in this browser.");
                }
            });
    } catch (error) {
        console.error("Error enabling Firestore persistence:", error);
    }
    
    appInitialized = true;
}


/**
 * Initializes Firebase and returns the Auth instance.
 * Uses a singleton pattern to ensure it only runs once.
 * @throws {Error} If Firebase configuration variables are missing.
 * @returns {Auth} The Firebase Auth instance.
 */
export const getAuth = (): Auth => {
    initializeFirebase();
    if (!authInstance) throw new Error("Firebase Auth not initialized");
    return authInstance;
};

/**
 * Initializes Firebase and returns the Firestore instance.
 * @returns {Firestore} The Firebase Firestore instance.
 */
export const getFirestoreDB = (): Firestore => {
    initializeFirebase();
    if (!firestoreInstance) throw new Error("Firebase Firestore not initialized");
    return firestoreInstance;
}