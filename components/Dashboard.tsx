import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/api';
import type { Plant, Task } from '../types';
import { Card, Spinner } from './ui';

const PlantCard: React.FC<{ plant: Plant }> = ({ plant }) => (
  <a href={`#/plant/${plant.id}`}>
    <Card className="h-full transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-800">
      <div className="p-4">
        <div className="font-bold text-lg text-emerald-800 dark:text-emerald-300 truncate">{plant.nickname || plant.commonName}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">{plant.species}</div>
        <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Added on {new Date(plant.createdAt).toLocaleDateString()}
        </div>
      </div>
    </Card>
  </a>
);

const UpcomingTasks: React.FC<{ tasks: Task[], plants: Plant[] }> = ({ tasks, plants }) => {
  const upcoming = useMemo(() => {
    const plantMap = new Map(plants.map(p => [p.id, p]));
    return tasks
      .filter(t => !t.completedAt)
      .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime())
      .slice(0, 5) // Show top 5
      .map(t => ({...t, plant: plantMap.get(t.plantId) }))
      .filter(t => t.plant); // Ensure plant exists
  }, [tasks, plants]);

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">Upcoming Tasks</h2>
        <Card className="p-4 space-y-3">
            {upcoming.map(task => (
                <a key={task.id} href={`#/plant/${task.plant!.id}`} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{task.title}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">For: <span className="font-medium">{task.plant!.nickname || task.plant!.commonName}</span></div>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 text-right">
                        Due: {new Date(task.nextRunAt).toLocaleDateString()}
                    </div>
                </a>
            ))}
        </Card>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [plantList, taskList] = await Promise.all([db.getPlants(), db.getTasks()]);
      setPlants(plantList);
      setTasks(taskList);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {!loading && <UpcomingTasks tasks={tasks} plants={plants} />}
      <div className="p-6 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/50 dark:to-teal-900/50 border border-emerald-100 dark:border-emerald-900">
        <h1 className="text-3xl font-bold text-emerald-800 dark:text-emerald-300">Your Digital Greenhouse</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Welcome back! Here are your beloved plants, ready for some TLC.</p>
      </div>
      
      {loading ? (
        <Spinner />
      ) : plants.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-300">No plants yet!</h2>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Click "Add New Plant" to start your collection.</p>
          <a href="#/add" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700">
            Add Your First Plant
          </a>
        </div>
      )}
      <a href="#/add" className="sm:hidden fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </a>
    </div>
  );
};