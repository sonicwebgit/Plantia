import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getAuth } from '../services/firebase';
import type { User } from '../types';
import App from '../App';
import { Spinner, Button } from './ui';

interface AuthContextType {
    user: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};


const LoginScreen = () => {
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        setIsSigningIn(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            // This getAuth() call will throw in the preview environment.
            // The catch block below will handle it and show a user-friendly message.
            await signInWithPopup(getAuth(), provider);
        } catch (error) {
            console.error("Google sign-in error:", error);
            const isInPreview = window.top !== window;
            if (isInPreview) {
                setError("Sign-in is disabled in the preview environment.");
            } else {
                 setError("Failed to sign in. Please try again.");
            }
            setIsSigningIn(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-5xl font-bold text-emerald-800 dark:text-emerald-300">Plantia</h1>
                <p className="mt-4 max-w-md text-slate-600 dark:text-slate-400">
                    Sign in with Google to securely save your plant collection to the cloud and access it from any device.
                </p>
            </div>
            <div className="mt-8">
                <Button onClick={handleLogin} disabled={isSigningIn}>
                    <svg className="w-5 h-5 mr-2" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 64.5C308.6 102.3 282.7 96 248 96c-88.8 0-160.1 71.9-160.1 160.1s71.3 160.1 160.1 160.1c98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
                    {isSigningIn ? 'Signing In...' : 'Sign in with Google'}
                </Button>
                {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
        </div>
    );
};


export const AuthProvider = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            // This will throw if config is missing, which is caught below.
            const auth = getAuth();
            const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
                if (firebaseUser) {
                    const { uid, displayName, email, photoURL } = firebaseUser;
                    setUser({ uid, displayName, email, photoURL });
                } else {
                    setUser(null);
                }
                setLoading(false);
            });
            return () => unsubscribe();
        } catch(e) {
            const isInPreview = window.top !== window;
            if (isInPreview) {
                // In the AI Studio preview, env vars aren't available.
                // We'll create a mock user to bypass the login screen
                // and allow the developer to preview the main app.
                console.warn("Firebase config missing. This is expected in preview. Creating a mock user session.");
                const mockUser: User = {
                    uid: 'preview-user-id',
                    displayName: 'Preview User',
                    email: 'preview@plantia.app',
                    photoURL: `https://i.pravatar.cc/150?u=preview-user`
                };
                setUser(mockUser);
                setLoading(false);
            } else {
                // In a real deployment, this is a fatal error.
                const message = e instanceof Error ? e.message : "An unknown error occurred during initialization.";
                setError(message);
                setLoading(false);
            }
        }
    }, []);

    if (error) {
        const isFirebaseError = error.toLowerCase().includes('firebase');
        return (
             <div style={{fontFamily: "sans-serif", padding: "2rem", textAlign: "center", backgroundColor: "#fff5f5", color: "#c53030", border: "1px solid #fc8181", borderRadius: "0.5rem", margin: "2rem"}}>
                <h1 style={{fontSize: "1.5rem", fontWeight: "bold"}}>{isFirebaseError ? 'Firebase Configuration Error' : 'Application Error'}</h1>
                <p>{error}</p>
                <p style={{fontSize: "0.8rem", marginTop: "1rem"}}>This is a developer message. The app will not function correctly until this is resolved.</p>
            </div>
        );
    }
    
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <Spinner />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user }}>
            {user ? <App user={user} /> : <LoginScreen />}
        </AuthContext.Provider>
    );
};