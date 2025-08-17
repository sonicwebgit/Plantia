import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/api';
import type { Plant, Task } from '../types';
import { Card, Spinner } from './ui';

const PlantCard = ({ plant }: { plant: Plant }) => (
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

const TaskTabs = ({ tasks, plants }: { tasks: Task[], plants: Plant[] }) => {
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');

  const plantMap = useMemo(() => new Map(plants.map(p => [p.id, p])), [plants]);

  const { incomplete, completed } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));
    
    const weekEnd = new Date(new Date().setDate(new Date().getDate() + 7));
    weekEnd.setHours(23, 59, 59, 999);

    const relevantTasks = tasks.filter(task => {
      const dueDate = new Date(task.nextRunAt);
      if (activeTab === 'today') {
        return dueDate >= todayStart && dueDate <= todayEnd;
      } else { // 'week'
        // Include tasks due from the start of today up to the end of the 7th day
        return dueDate >= todayStart && dueDate <= weekEnd;
      }
    });

    const incompleteTasks = relevantTasks
      .filter(t => !t.completedAt)
      .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime());
    
    const completedTasks = relevantTasks
      .filter(t => t.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

    return { incomplete: incompleteTasks, completed: completedTasks };
  }, [tasks, activeTab]);

  const renderTask = (task: Task) => {
    const plant = plantMap.get(task.plantId);
    if (!plant) return null;

    const isComplete = !!task.completedAt;
    const baseClasses = "flex items-center justify-between p-3 rounded-lg transition-colors";
    const styleClasses = isComplete 
        ? "bg-emerald-600 text-white hover:bg-emerald-700" 
        : "bg-red-600 text-white hover:bg-red-700";

    return (
      <a key={task.id} href={`#/plant/${plant.id}`} className={`${baseClasses} ${styleClasses}`}>
        <div>
          <div className="font-semibold">{task.title}</div>
          <div className="text-sm opacity-90">For: <span className="font-medium">{plant.nickname || plant.commonName}</span></div>
        </div>
        <div className="text-sm opacity-90 text-right">
          {isComplete ? `Done: ${new Date(task.completedAt!).toLocaleDateString()}` : `Due: ${new Date(task.nextRunAt).toLocaleDateString()}`}
        </div>
      </a>
    );
  };
  
  const TabButton = ({ tab, label }: { tab: 'today' | 'week', label: string }) => {
    const isActive = activeTab === tab;
    const activeClass = "bg-emerald-600 text-white shadow-md";
    const inactiveClass = "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600";
    return (
        <button onClick={() => setActiveTab(tab)} className={`w-full rounded-md py-2 text-sm font-semibold transition-all ${isActive ? activeClass : inactiveClass}`}>
            {label}
        </button>
    );
  };

  if (tasks.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex space-x-2 rounded-lg bg-slate-100 dark:bg-slate-900 p-1 mb-4">
          <TabButton tab="today" label="Today's Tasks" />
          <TabButton tab="week" label="Weekly Tasks" />
      </div>

      <Card>
        <div className="p-4 space-y-4">
          {incomplete.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 px-1">To Do</h3>
              <div className="space-y-3">
                {incomplete.map(renderTask)}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div className={`${incomplete.length > 0 ? 'pt-4 border-t border-slate-200 dark:border-slate-700' : ''}`}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 px-1">Completed</h3>
              <div className="space-y-3">
                {completed.map(renderTask)}
              </div>
            </div>
          )}

          {incomplete.length === 0 && completed.length === 0 && (
             <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
                No tasks scheduled for {activeTab === 'today' ? 'today' : 'this week'}.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};


export const Dashboard = () => {
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
      {!loading && <TaskTabs tasks={tasks} plants={plants} />}
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
          <p className="mt-1 text-slate-500 dark:text-slate-400">Click the "+" button below to start your collection.</p>
          <a href="#/add" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700">
            Add Your First Plant
          </a>
        </div>
      )}
    </div>
  );
};
