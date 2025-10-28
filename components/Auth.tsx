import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebase';
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
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Google sign-in error:", error);
            setError("Failed to sign in. Please try again.");
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

    useEffect(() => {
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
    }, []);

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
