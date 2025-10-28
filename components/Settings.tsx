import React, { useState, useEffect } from 'react';
import { db } from '../services/api';
import { auth } from '../services/firebase';
import { Card, Button } from './ui';
import type { User } from '../types';

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


export const Settings = ({ user }: { user: User }) => {
    const [theme, setTheme] = useState<Theme>('system');
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [notifPermission, setNotifPermission] = useState<PermissionState>('prompt');
    const [syncSupported, setSyncSupported] = useState(false);

    useEffect(() => {
        try {
            const storedTheme = localStorage.getItem('plantia_theme') as Theme | null;
            if (storedTheme) setTheme(storedTheme);
        } catch (error) {
            console.error("Could not read theme from localStorage.", error);
        }
        
        const canUseNotifications =
            typeof window !== 'undefined' &&
            'Notification' in window &&
            'serviceWorker' in navigator &&
            window.isSecureContext &&
            window.top === window;

        const checkSupportAndPermissions = async () => {
             if (!canUseNotifications) {
                setNotifPermission('denied');
                setSyncSupported(false);
                return;
            }

            const permissionResult = Notification.permission;
            const permission = permissionResult === 'default' ? 'prompt' : permissionResult;
            setNotifPermission(permission);
            
            const storedNotif = localStorage.getItem('plantia_notifications_enabled') === 'true';
            setNotificationsEnabled(permission === 'granted' && storedNotif);
            
            try {
                const registration = await navigator.serviceWorker.ready;
                setSyncSupported('periodicSync' in registration);
            } catch (error) {
                console.warn("Could not check for Periodic Sync support:", error);
                setSyncSupported(false);
            }
        };

        checkSupportAndPermissions();
        
        if (canUseNotifications && navigator.permissions?.query) {
             navigator.permissions.query({ name: 'notifications' }).then(status => {
                status.onchange = () => {
                    const newPermission = status.state as PermissionState;
                    setNotifPermission(newPermission);
                    if (newPermission !== 'granted') {
                        localStorage.setItem('plantia_notifications_enabled', 'false');
                        setNotificationsEnabled(false);
                    }
                };
            });
        }
    }, []);

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
       const canUseNotifications =
            typeof window !== 'undefined' &&
            'Notification' in window &&
            'serviceWorker' in navigator &&
            window.isSecureContext &&
            window.top === window;

        if (!canUseNotifications) {
            alert("Notifications are not available in this environment (e.g., iframe or non-HTTPS).");
            return;
        }

        const isEnabling = !notificationsEnabled;

        if (isEnabling) {
            try {
                const requestedPermission = await Notification.requestPermission();
                const permission = requestedPermission === 'default' ? 'prompt' : requestedPermission;
                setNotifPermission(permission);

                if (permission !== 'granted') {
                    if (permission === 'denied') {
                        alert("Notifications are blocked. Please enable them in your browser's site settings.");
                    }
                    return;
                }
                
                const registration = await navigator.serviceWorker.ready;
                if ('periodicSync' in registration) {
                    try {
                        await registration.periodicSync.register(NOTIFICATION_TAG, {
                            minInterval: 24 * 60 * 60 * 1000,
                        });
                    } catch (e) {
                        console.warn('Periodic Sync not available or failed to register:', e);
                    }
                }

                localStorage.setItem('plantia_notifications_enabled', 'true');
                setNotificationsEnabled(true);
            } catch (e) {
                console.error('Enabling notifications failed:', e);
                alert("An unexpected error occurred while enabling notifications.");
            }
        } else {
            localStorage.setItem('plantia_notifications_enabled', 'false');
            setNotificationsEnabled(false);
            try {
                const registration = await navigator.serviceWorker.ready;
                if ('periodicSync' in registration) {
                    await registration.periodicSync.unregister(NOTIFICATION_TAG);
                }
            } catch (error) {
                console.error('Failed to unregister periodic sync:', error);
            }
        }
    };

    const handleClearData = async () => {
        const isConfirmed = window.confirm("Are you sure you want to delete all your plant data from the cloud? This action cannot be undone.");
        if (isConfirmed) {
            try {
                await db.clearAllData();
                alert("All data has been cleared.");
                window.location.hash = '#/';
                window.location.reload();
            } catch (error) {
                console.error("Error clearing data:", error);
                alert("Failed to clear data. Please try again.");
            }
        }
    };
    
    const handleLogout = () => {
        auth.signOut();
    };

    const getButtonClass = (isActive: boolean) => {
        return isActive
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600';
    };
    
    const getNotificationStatusText = () => {
        const canUseNotifications =
            typeof window !== 'undefined' &&
            'Notification' in window &&
            'serviceWorker' in navigator &&
            window.isSecureContext &&
            window.top === window;

        if (!canUseNotifications) return "Notifications are not available in this environment (e.g., iframe or non-HTTPS).";
        if (notifPermission === 'denied') return "Notifications are blocked. Please enable them in your browser's site settings.";
        if (notificationsEnabled) {
            return syncSupported ? "You will receive reminders for tasks, even when the app is closed." : "Reminders are on. Notifications may only appear when the app is open.";
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
                    <h2 className="text-lg font-semibold mb-4">Account</h2>
                    <div className="flex items-center">
                        {user.photoURL && <img src={user.photoURL} alt="User profile" className="h-14 w-14 rounded-full" />}
                        <div className="ml-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{user.displayName}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                        </div>
                         <Button variant="secondary" onClick={handleLogout} className="ml-auto">
                            Logout
                        </Button>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-3">Appearance</h2>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme</label>
                      <div className="mt-2 flex space-x-2 rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
                          <button onClick={() => handleThemeChange('light')} className={`w-full rounded-md py-1.5 text-sm font-semibold transition-colors ${getButtonClass(theme === 'light')}`}>
                              Light
                          </button>
                           <button onClick={() => handleThemeChange('dark')} className={`w-full rounded-md py-1.5 text-sm font-semibold transition-colors ${getButtonClass(theme === 'dark')}`}>
                              Dark
                          </button>
                           <button onClick={() => handleThemeChange('system')} className={`w-full rounded-md py-1.5 text-sm font-semibold transition-colors ${getButtonClass(theme === 'system')}`}>
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
                            checked={notificationsEnabled}
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
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Permanently delete your entire plant collection from the cloud.</p>
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