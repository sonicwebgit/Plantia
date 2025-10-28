import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Use import.meta.env for Vite projects to securely load environment variables
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate that the essential Firebase config keys are present.
// This provides a clear, developer-friendly error if the .env file is missing or misconfigured.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    const rootEl = document.getElementById('root');
    if (rootEl) {
        rootEl.innerHTML = `
            <div style="font-family: sans-serif; padding: 2rem; text-align: center; background-color: #fff5f5; color: #c53030; border: 1px solid #fc8181; border-radius: 0.5rem; margin: 2rem;">
                <h1 style="font-size: 1.5rem; font-weight: bold;">Firebase Configuration Error</h1>
                <p>Firebase environment variables are missing. Please ensure you have a <code>.env</code> file with the correct VITE_FIREBASE_* keys and have restarted the development server.</p>
                <p style="font-size: 0.8rem; margin-top: 1rem;">This is a developer message. The app will not function correctly until this is resolved.</p>
            </div>
        `;
    }
    // Prevent the app from initializing further by throwing an error.
    throw new Error("Firebase configuration variables are missing. See the message in the UI.");
}


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services for use in other parts of the application
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
