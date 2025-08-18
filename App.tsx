import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { AddPlant } from './components/AddPlant';
import { PlantDetail } from './components/PlantDetail';
import { Settings } from './components/Settings';
import { Tasks } from './components/Tasks';
import { Analytics } from './components/Analytics';
import { BottomNav } from './components/ui';
import { db } from './services/api';

const App = () => {
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

  // Effect to handle sending daily task notifications
  useEffect(() => {
    const checkAndSendNotifications = async () => {
      try {
        const notificationsEnabled = localStorage.getItem('plantia_notifications_enabled') === 'true';
        const alreadyNotified = sessionStorage.getItem('plantia_session_notified') === 'true';
        
        // Abort if user has disabled notifications, has already been notified this session, or browser permission isn't granted
        if (!notificationsEnabled || alreadyNotified || !('Notification' in window) || Notification.permission !== 'granted') {
          return;
        }

        const allTasks = await db.getTasks();
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const incompleteToday = allTasks.filter(task => {
          if (task.completedAt) return false;
          const dueDate = new Date(task.nextRunAt);
          return dueDate >= todayStart && dueDate <= todayEnd;
        });

        if (incompleteToday.length > 0) {
          const notification = new Notification('Plantia Task Reminder', {
            body: `You have ${incompleteToday.length} task${incompleteToday.length > 1 ? 's' : ''} to complete today!`,
            icon: '/vite.svg', // Assuming vite.svg is the app icon
            silent: false,
          });

          // Mark that a notification has been sent for this session to avoid spam.
          sessionStorage.setItem('plantia_session_notified', 'true');
        }
      } catch (error) {
        console.error("Error checking for task notifications:", error);
      }
    };
    
    // Check for notifications shortly after the app loads
    const timer = setTimeout(checkAndSendNotifications, 3000);

    return () => clearTimeout(timer);
  }, []);


  const renderContent = () => {
    if (route.startsWith('#/plant/')) {
      const id = route.split('/')[2];
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

export default App;