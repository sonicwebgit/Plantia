import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { AddPlant } from './components/AddPlant';
import { PlantDetail } from './components/PlantDetail';
import { Settings } from './components/Settings';
import { Header } from './components/ui';

const App = () => {
  const [route, setRoute] = useState<string>(window.location.hash);

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
