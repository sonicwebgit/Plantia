import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t, i18n } = useTranslation();
    const [theme, setTheme] = useState<Theme>('system');
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [notifPermission, setNotifPermission] = useState<PermissionState>('prompt');
    const [syncSupported, setSyncSupported] = useState(false);

    useEffect(() => {
        // Load settings from localStorage
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

        // Check feature support and permissions
        const checkSupportAndPermissions = async () => {
             if (!canUseNotifications) {
                setNotifPermission('denied'); // Treat unsupported env as 'denied' for UI purposes
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
        
        // Listen for external permission changes
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
            alert(t('settings.themeError'));
        }
    };
    
    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        db.setSetting('language', lang);
    };

    const handleNotificationToggle = async () => {
       const canUseNotifications =
            typeof window !== 'undefined' &&
            'Notification' in window &&
            'serviceWorker' in navigator &&
            window.isSecureContext &&
            window.top === window;

        if (!canUseNotifications) {
            alert(t('settings.notifStatus.unsupported'));
            return;
        }

        const isEnabling = !notificationsEnabled;

        if (isEnabling) {
            try {
                const requestedPermission = await Notification.requestPermission();
                const permission = requestedPermission === 'default' ? 'prompt' : requestedPermission;
                setNotifPermission(permission); // Always update the permission state display

                if (permission !== 'granted') {
                    if (permission === 'denied') {
                        alert(t('settings.notifStatus.denied'));
                    }
                    return; // Stop if permission is not granted
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

                // ONLY set as enabled if permission was granted.
                localStorage.setItem('plantia_notifications_enabled', 'true');
                setNotificationsEnabled(true);
            } catch (e) {
                console.error('Enabling notifications failed:', e);
                alert(t('settings.notifEnableError'));
            }
        } else {
            // Disabling
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
        const isConfirmed = window.confirm(t('settings.clearDataConfirm'));
        if (isConfirmed) {
            await db.clearAllData();
            alert(t('settings.clearDataSuccess'));
            window.location.hash = '#/';
            window.location.reload(); // Force a reload to clear state
        }
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

        if (!canUseNotifications) return t('settings.notifStatus.unsupported');
        if (notifPermission === 'denied') return t('settings.notifStatus.denied');
        if (notificationsEnabled) {
            return syncSupported ? t('settings.notifStatus.enabled_sync') : t('settings.notifStatus.enabled_no_sync');
        }
        return t('settings.notifStatus.disabled');
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400">{t('settings.subtitle')}</p>
            </div>

            <Card>
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-3">{t('settings.appearance')}</h2>
                    <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.theme')}</label>
                          <div className="mt-2 flex space-x-2 rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
                              <button onClick={() => handleThemeChange('light')} className={`w-full rounded-md py-1.5 text-sm font-semibold transition-colors ${getButtonClass(theme === 'light')}`}>
                                  {t('settings.light')}
                              </button>
                               <button onClick={() => handleThemeChange('dark')} className={`w-full rounded-md py-1.5 text-sm font-semibold transition-colors ${getButtonClass(theme === 'dark')}`}>
                                  {t('settings.dark')}
                              </button>
                               <button onClick={() => handleThemeChange('system')} className={`w-full rounded-md py-1.5 text-sm font-semibold transition-colors ${getButtonClass(theme === 'system')}`}>
                                  {t('settings.system')}
                              </button>
                          </div>
                        </div>
                         <div>
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.language')}</label>
                          <div className="mt-2 flex space-x-2 rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
                              <button onClick={() => handleLanguageChange('en')} className={`w-full rounded-md py-1.5 text-sm font-semibold transition-colors ${getButtonClass(i18n.language.startsWith('en'))}`}>
                                  English
                              </button>
                               <button onClick={() => handleLanguageChange('mk')} className={`w-full rounded-md py-1.5 text-sm font-semibold transition-colors ${getButtonClass(i18n.language === 'mk')}`}>
                                  Македонски
                              </button>
                          </div>
                        </div>
                    </div>
                </div>
            </Card>
            
            <Card>
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4">{t('settings.notifications')}</h2>
                    <div className="flex items-start justify-between">
                        <div className="pr-4">
                           <label htmlFor="notif-toggle" className="font-medium text-slate-700 dark:text-slate-300">
                                {t('settings.taskReminders')}
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
                    <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3">{t('settings.dangerZone')}</h2>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-medium">{t('settings.clearAllData')}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('settings.clearAllDataDesc')}</p>
                        </div>
                        <Button variant="danger" onClick={handleClearData} className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0">
                            {t('settings.deleteAllButton')}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};