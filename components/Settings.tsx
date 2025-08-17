import React, { useState, useEffect } from 'react';
import { db } from '../services/api';
import { Card, Button } from './ui';

type Theme = 'light' | 'dark' | 'system';

export const Settings = () => {
    const [theme, setTheme] = useState<Theme>('system');

    useEffect(() => {
        const storedTheme = localStorage.getItem('plantia_theme') as Theme | null;
        if (storedTheme) {
            setTheme(storedTheme);
        }
    }, []);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem('plantia_theme', newTheme);
        window.dispatchEvent(new Event('themeChange'));
    };

    const handleClearData = () => {
        const isConfirmed = window.confirm(
            'Are you sure you want to delete all your plant data? This action cannot be undone.'
        );
        if (isConfirmed) {
            db.clearAllData();
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