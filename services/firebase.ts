import { initializeApp } from 'firebase/app';
import { getAuth as getFirebaseAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, enableIndexedDbPersistence, Firestore } from 'firebase/firestore';


const firebaseConfig = {
  // Use process.env to securely load environment variables, ensuring compatibility with standard deployment platforms.
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

let appInitialized = false;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

function initializeFirebase() {
    if (appInitialized) return;

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error("Firebase environment variables are missing. Please ensure you have the correct FIREBASE_* keys configured for your deployment.");
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