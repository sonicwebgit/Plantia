import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { AddPlant } from './components/AddPlant';
import { PlantDetail } from './components/PlantDetail';
import { Settings } from './components/Settings';
import { Header } from './components/ui';

const MissingApiKey: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
    <div className="max-w-2xl p-8 mx-4 text-center bg-white border rounded-lg shadow-md dark:bg-slate-800 dark:border-slate-700">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <h1 className="mt-4 text-2xl font-bold text-slate-800 dark:text-slate-100">Configuration Error</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        The application is missing the required <strong>API_KEY</strong> environment variable. The AI features cannot be initialized without it.
      </p>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        If you are the owner of this project, please go to your project settings on Vercel (or your hosting provider) and add an environment variable named <code className="px-1 py-0.5 font-mono text-sm bg-slate-100 dark:bg-slate-700 rounded">API_KEY</code> with your Google Gemini API Key as the value.
      </p>
      <div className="mt-6">
        <a href="https://vercel.com/docs/projects/environment-variables" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white transition-colors bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700">
          How to add Environment Variables on Vercel
        </a>
      </div>
    </div>
  </div>
);


const App: React.FC = () => {
  const [route, setRoute] = useState<string>(window.location.hash);
  
  // A simple check for the API key.
  const apiKeyExists = !!process.env.API_KEY;

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const theme = localStorage.getItem('plantia_theme') || 'system';
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
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

  if (!apiKeyExists) {
    return <MissingApiKey />;
  }

  const renderContent = () => {
    if (route.startsWith('#/plant/')) {
      const id = route.split('/')[2];
      return <PlantDetail plantId={id} />;
    }

    switch (route) {
      case '#/add':
        return <AddPlant />;
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
    <div className="min-h-screen text-slate-800 dark:text-slate-200">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
      <footer className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
        <p>Built with ❤️ for every leaf. &copy; {new Date().getFullYear()} Plantia.</p>
      </footer>
    </div>
  );
};

export default App;