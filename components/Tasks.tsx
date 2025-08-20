import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../services/api';
import type { Plant, Task } from '../types';
import { Card, Spinner } from './ui';

interface TaskWithPlant extends Task {
  plant: Plant;
}

export const Tasks = () => {
  const [tasks, setTasks] = useState<TaskWithPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [taskList, plantList] = await Promise.all([db.getTasks(), db.getPlants()]);
      
      const plantMap = new Map(plantList.map(p => [p.id, p]));
      const tasksWithPlants = taskList
        .map(t => ({ ...t, plant: plantMap.get(t.plantId) }))
        .filter(t => t.plant) as TaskWithPlant[];
      
      setTasks(tasksWithPlants);
      setLoading(false);
    };
    fetchData();
  }, []);

  const { incomplete, completed } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
    
    const weekEnd = new Date(new Date().setDate(todayStart.getDate() + 7));
    weekEnd.setHours(23, 59, 59, 999);

    const relevantTasks = tasks.filter(task => {
      const dueDate = new Date(task.nextRunAt);
      if (activeTab === 'today') {
        return dueDate >= todayStart && dueDate <= todayEnd;
      } else { // 'week'
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

  const renderTask = (task: TaskWithPlant) => {
    const isComplete = !!task.completedAt;
    const baseClasses = "flex items-center justify-between p-3 rounded-lg transition-colors";
    const styleClasses = isComplete 
        ? "bg-slate-100 dark:bg-slate-700/50" 
        : "bg-emerald-50 dark:bg-emerald-900/30";

    return (
      <a key={task.id} href={`#/plant/${task.plant.id}`} className={`${baseClasses} ${styleClasses}`}>
        <div>
          <div className="font-semibold">{t(`tasks.type.${task.type}`, task.title)}</div>
          <div className="text-sm opacity-90">{t('tasks.for', { plantName: task.plant.nickname || task.plant.commonName })}</div>
        </div>
        <div className="text-sm opacity-90 text-right">
          {isComplete ? t('tasks.doneDate', { date: new Date(task.completedAt!).toLocaleDateString(i18n.language) }) : t('tasks.dueDate', { date: new Date(task.nextRunAt).toLocaleDateString(i18n.language) })}
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('tasks.title')}</h1>
      
      <div className="flex space-x-2 rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
          <TabButton tab="today" label={t('tasks.today')} />
          <TabButton tab="week" label={t('tasks.week')} />
      </div>

      {loading ? <Spinner /> : (
        <div className="space-y-8">
            {incomplete.length === 0 && completed.length === 0 ? (
                <Card>
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-10 px-4">
                        {activeTab === 'today' ? t('tasks.noTasksToday') : t('tasks.noTasksWeek')}
                    </p>
                </Card>
            ) : (
                <>
                    {incomplete.length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">{t('tasks.toDo')}</h2>
                            <Card>
                                <div className="p-4 space-y-3">
                                    {incomplete.map(renderTask)}
                                </div>
                            </Card>
                        </div>
                    )}

                    {completed.length > 0 && (
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">{t('tasks.completed')}</h2>
                            <Card>
                                <div className="p-4 space-y-3">
                                    {completed.map(renderTask)}
                                </div>
                            </Card>
                        </div>
                    )}
                </>
            )}
        </div>
      )}
    </div>
  );
};