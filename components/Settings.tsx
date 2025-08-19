import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/api';
import { Card, Button } from './ui';

type Theme = 'light' | 'dark' | 'system';
type PermissionState = 'prompt' | 'granted' | 'denied';

const NOTIFICATION_TAG = 'daily-task-check';

// A simple toggle switch component, styled with Tailwind CSS
const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean, onChange: () => void, disabled?: boolean }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:ring-offset-slate-900 ${
      checked ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
  >
    <span
      aria-hidden="true"
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);


export const Settings = () => {
    const [theme, setTheme] = useState<Theme>('system');
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [notifPermission, setNotifPermission] = useState<PermissionState>('prompt');
    const [syncPermission, setSyncPermission] = useState<PermissionState>('prompt');

    const updatePermissionsState = useCallback(async () => {
        if ('Notification' in window) {
            setNotifPermission(Notification.permission as PermissionState);
        } else {
            setNotifPermission('denied');
        }

        // Check for periodicSync support before querying permission for it
        if ('serviceWorker' in navigator && 'permissions' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
             const status = await navigator.permissions.query({ name: 'periodic-background-sync' } as unknown as PermissionDescriptor);
             setSyncPermission(status.state as PermissionState);
        } else {
             // If API not supported, assume granted if notifications are on, to not block the UI
             setSyncPermission(localStorage.getItem('plantia_notifications_enabled') === 'true' ? 'granted' : 'prompt');
        }
    }, []);
    
    useEffect(() => {
        try {
            const storedTheme = localStorage.getItem('plantia_theme') as Theme | null;
            if (storedTheme) setTheme(storedTheme);
            const storedNotif = localStorage.getItem('plantia_notifications_enabled') === 'true';
            setNotificationsEnabled(storedNotif);
        } catch (error) {
            console.error("Could not read settings from localStorage.", error);
        }
        updatePermissionsState();
    }, [updatePermissionsState]);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        try {
            localStorage.setItem('plantia_theme', newTheme);
            window.dispatchEvent(new Event('themeChange'));
        } catch (error) {
            console.error("Could not save theme to localStorage.", error);
            alert("Could not save theme preference. Your browser might be blocking storage access.");
        }
    };
    
    const handleNotificationToggle = async () => {
        const newState = !notificationsEnabled;
        if (newState) {
            // Enabling Notifications
            const permission = await Notification.requestPermission();
            setNotifPermission(permission as PermissionState);

            if (permission !== 'granted') {
                alert("Notification permission is required. Please grant it in your browser settings.");
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            if (registration.periodicSync) {
                try {
                    await registration.periodicSync.register(NOTIFICATION_TAG, {
                         minInterval: 12 * 60 * 60 * 1000, // 12 hours
                    });
                } catch (e) {
                    console.error('Periodic Sync could not be registered!', e);
                    alert('Background reminders could not be set up. You may need to enable this feature in your browser settings.');
                    return; // Don't enable if sync registration fails
                }
            }
            localStorage.setItem('plantia_notifications_enabled', 'true');
            setNotificationsEnabled(true);
        } else {
            // Disabling Notifications
            const registration = await navigator.serviceWorker.ready;
            if (registration.periodicSync) {
                await registration.periodicSync.unregister(NOTIFICATION_TAG);
            }
            localStorage.setItem('plantia_notifications_enabled', 'false');
            setNotificationsEnabled(false);
        }
         updatePermissionsState();
    };

    const handleClearData = async () => {
        const isConfirmed = window.confirm(
            'Are you sure you want to delete all your plant data? This action cannot be undone.'
        );
        if (isConfirmed) {
            await db.clearAllData();
            alert('All data has been cleared.');
            window.location.hash = '#/';
            window.location.reload(); // Force a reload to clear state
        }
    };

    const getButtonClass = (buttonTheme: Theme) => {
        return theme === buttonTheme
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600';
    };
    
    const getNotificationStatusText = () => {
        if (notifPermission === 'denied') {
            return "Notifications are blocked. Please enable them in your browser's site settings.";
        }
        if (notificationsEnabled) {
            return "You will receive reminders for daily tasks, even when the app is closed.";
        }
        return "Enable to receive daily task reminders.";
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400">Manage your application preferences and data.</p>
            </div>

            <Card>
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-3">Appearance</h2>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme</label>
                        <div className="flex space-x-2 rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
                            <button onClick={() => handleThemeChange('light')} className={`w-full rounded-md py-1.5 text-sm font-semibold transition-colors ${getButtonClass('light')}`}>
                                Light
                            </button>
                             <button onClick={() => handleThemeChange('dark')} className={`w-full rounded-md py-1.5 text-sm font-semibold transition-colors ${getButtonClass('dark')}`}>
                                Dark
                            </button>
                             <button onClick={() => handleThemeChange('system')} className={`w-full rounded-md py-1.5 text-sm font-semibold transition-colors ${getButtonClass('system')}`}>
                                System
                            </button>
                        </div>
                    </div>
                </div>
            </Card>
            
            <Card>
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Notifications</h2>
                    <div className="flex items-start justify-between">
                        <div className="pr-4">
                           <label htmlFor="notif-toggle" className="font-medium text-slate-700 dark:text-slate-300">
                                Background Task Reminders
                            </label>
                             <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{getNotificationStatusText()}</p>
                        </div>
                        <ToggleSwitch
                            checked={notificationsEnabled && notifPermission === 'granted'}
                            onChange={handleNotificationToggle}
                            disabled={notifPermission === 'denied'}
                        />
                    </div>
                </div>
            </Card>

             <Card>
                <div className="p-6 border-t border-red-200 dark:border-red-900/50">
                    <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3">Danger Zone</h2>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-medium">Clear All Data</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Permanently delete your entire plant collection, including all photos and tasks.</p>
                        </div>
                        <Button variant="danger" onClick={handleClearData} className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0">
                            Delete All Data
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};