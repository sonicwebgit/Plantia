import React, { useState, useEffect } from 'react';
// Testing simple API endpoint - 2025-01-27 16:00 UTC
// Deployment timestamp: 2025-08-23 14:45 - Force authentication deployment
// GitHub Desktop deployment test - 2025-08-27
// MAJOR CHANGE: Testing deployment via GitHub Desktop
// TESTING QODER → GITHUB DESKTOP CONNECTION
import { Dashboard } from './components/Dashboard';
import { AddPlant } from './components/AddPlant';
import { PlantDetail } from './components/PlantDetail';
import { Settings } from './components/Settings';
import { Tasks } from './components/Tasks';
import { Analytics } from './components/Analytics';
import { BottomNav, Spinner } from './components/ui';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/AuthPage';


const ProtectedApp = () => {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<string>(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    // Set the lang attribute on the HTML element for accessibility and CSS
    document.documentElement.lang = 'en';
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      try {
        const theme = localStorage.getItem('plantia_theme') || 'system';
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (error) {
        console.error("Could not access localStorage for theme, using system default.", error);
        // Fallback to system theme if localStorage is inaccessible
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
           document.documentElement.classList.add('dark');
        } else {
           document.documentElement.classList.remove('dark');
        }
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', applyTheme);
    window.addEventListener('themeChange', applyTheme); // Custom event from Settings page

    return () => {
      mediaQuery.removeEventListener('change', applyTheme);
      window.removeEventListener('themeChange', applyTheme);
    };
  }, []);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Show auth page if user is not authenticated
  if (!user) {
    return <AuthPage />;
  }

  const renderContent = () => {
    const plantMatch = route.match(/^#\/plant\/(.+)/);
    if (plantMatch) {
      const id = plantMatch[1];
      return <PlantDetail plantId={id} />;
    }

    switch (route) {
      case '#/add':
        return <AddPlant />;
      case '#/tasks':
        return <Tasks />;
      case '#/analytics':
        return <Analytics />;
      case '#/settings':
        return <Settings />;
      case '#/':
      case '':
        return <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 pb-28">
        {renderContent()}
      </main>
      <BottomNav currentRoute={route} />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
};

export default App;