import React, { useState, useEffect } from 'react';
import { db } from '../services/api';
import type { Plant, Task, Photo } from '../types';
import { Card, Spinner } from './ui';

interface AnalyticsData {
    totalPlants: number;
    uniqueSpecies: number;
    totalPhotos: number;
    tasksThisWeek: number;
    plantsByLocation: Record<string, number>;
}

// State for the component, combines loading, error, and data
interface AnalyticsState {
    loading: boolean;
    error: string | null;
    data: AnalyticsData | null;
}

const StatCard = ({ icon, value, label }: { icon: React.ReactNode, value: string | number, label: string }) => (
    <Card>
        <div className="p-5 flex items-center">
            <div className="mr-4 p-3 rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300">
                {icon}
            </div>
            <div>
                <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
            </div>
        </div>
    </Card>
);

export const Analytics = () => {
    // Use a single state object for clarity and to prevent inconsistent states
    const [state, setState] = useState<AnalyticsState>({
        loading: true,
        error: null,
        data: null,
    });

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                // Fetch all data in parallel for better performance
                const [plants, tasks, photos] = await Promise.all([
                    db.getPlants(),
                    db.getTasks(),
                    db.getPhotos(),
                ]);

                // If the component has unmounted while fetching, do nothing.
                if (!isMounted) return;

                const totalPlants = plants.length;
                const uniqueSpecies = new Set(plants.map(p => p.species)).size;
                const totalPhotos = photos.length;

                const now = new Date();
                const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                const tasksThisWeek = tasks.filter(t => {
                    const dueDate = new Date(t.nextRunAt);
                    return !t.completedAt && dueDate >= now && dueDate <= oneWeekFromNow;
                }).length;

                const plantsByLocation = plants.reduce((acc, plant) => {
                    const location = plant.location || 'Unassigned';
                    acc[location] = (acc[location] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                
                setState({
                    loading: false,
                    error: null,
                    data: {
                        totalPlants,
                        uniqueSpecies,
                        totalPhotos,
                        tasksThisWeek,
                        plantsByLocation
                    }
                });
            } catch (err) {
                 const message = err instanceof Error ? err.message : "An unknown error occurred.";
                 console.error("Failed to fetch analytics data:", err);
                 // If the component has unmounted, do nothing to prevent errors.
                 if (isMounted) {
                    setState({ loading: false, error: message, data: null });
                 }
            }
        };

        fetchData();
        
        // Cleanup function to run when the component unmounts
        return () => {
            isMounted = false;
        };
    }, []); 

    // Render logic based on the single state object
    
    // 1. Handle Loading
    if (state.loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                <Spinner />
            </div>
        );
    }
    
    // 2. Handle Error
    if (state.error) {
        return (
             <div className="space-y-6">
                <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                <Card>
                    <div className="p-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                         <h3 className="font-bold">Error loading analytics</h3>
                         <p className="text-sm mt-1">{state.error}</p>
                    </div>
                </Card>
            </div>
        )
    }

    // 3. Handle No Data
    if (!state.data || state.data.totalPlants === 0) {
        return (
             <div className="space-y-6">
                <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                <Card>
                    <div className="p-10 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <h2 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-300">No Data Yet</h2>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">Add a plant to start seeing your collection's analytics.</p>
                         <a href="#/add" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700">
                            Add a Plant
                        </a>
                    </div>
                </Card>
            </div>
        )
    }

    // 4. Render Data
    const { totalPlants, uniqueSpecies, totalPhotos, tasksThisWeek, plantsByLocation } = state.data;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    value={totalPlants}
                    label="Total Plants"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.884 4.025A9 9 0 1016.116 4.025" /></svg>}
                />
                 <StatCard 
                    value={uniqueSpecies}
                    label="Unique Species"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2-2z" /></svg>}
                />
                 <StatCard 
                    value={totalPhotos}
                    label="Photos Taken"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                />
                 <StatCard 
                    value={tasksThisWeek}
                    label="Tasks This Week"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                />
            </div>

            {Object.keys(plantsByLocation).length > 0 && (
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">Plants by Location</h2>
                    <Card>
                        <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            {Object.entries(plantsByLocation).sort(([, a], [, b]) => b - a).map(([location, count]) => (
                                <div key={location} className="p-4 flex justify-between items-center">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{location}</span>
                                    <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{count}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};