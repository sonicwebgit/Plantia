import React from 'react';
import { Card } from './ui';

export const Analytics = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Analytics</h1>
            <Card>
                <div className="p-10 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    <h2 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-300">Advanced Analytics Coming Soon!</h2>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Track growth trends, monitor plant health, and get deeper insights into your collection.</p>
                </div>
            </Card>
        </div>
    );
};
