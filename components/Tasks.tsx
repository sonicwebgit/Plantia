import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../services/api';
import type { Plant, Task } from '../types';
import { Card, Spinner, Button } from './ui';

// Map status to colors for borders and text
const statusStyles = {
    pending: { border: 'border-red-500 dark:border-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
    partial: { border: 'border-orange-500 dark:border-orange-400', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
    completed: { border: 'border-green-500 dark:border-green-500', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
};

type TaskStatus = keyof typeof statusStyles;

interface PlantTaskData {
  plant: Plant;
  status: TaskStatus;
  tasks: Task[]; // Only incomplete tasks
}

const PlantTaskCard = ({ data, onCompleteTask }: { data: PlantTaskData, onCompleteTask: (taskId: string) => void }) => {
    const { plant, status, tasks } = data;
    const styles = statusStyles[status];

    return (
        <Card className={`overflow-hidden border-l-4 ${styles.border}`}>
            <div className="p-4">
                <a href={`#/plant/${plant.id}`} className="block">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">{plant.nickname || plant.commonName}</h3>
                    <p className={`text-sm font-semibold ${styles.text}`}>
                        {status === 'pending' && `${tasks.length} task(s) pending`}
                        {status === 'partial' && `${tasks.length} task(s) remaining`}
                        {status === 'completed' && 'All tasks complete!'}
                    </p>
                </a>

                {tasks.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                        {tasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between p-2 rounded-md bg-slate-100 dark:bg-slate-800">
                                <div>
                                    <p className="font-medium text-sm text-slate-700 dark:text-slate-300">{task.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Due: {new Date(task.nextRunAt).toLocaleDateString()}</p>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => onCompleteTask(task.id)}>
                                    Complete
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    )
};


export const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [taskList, plantList] = await Promise.all([db.getTasks(), db.getPlants()]);
    setTasks(taskList);
    setPlants(plantList);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const plantData: PlantTaskData[] = useMemo(() => {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
    const weekEnd = new Date(new Date(todayStart).setDate(todayStart.getDate() + 6));
    weekEnd.setHours(23, 59, 59, 999);
    
    const periodEnd = activeTab === 'today' ? todayEnd : weekEnd;

    const taskMap = new Map<string, Task[]>();
    tasks.forEach(task => {
        const plantTasks = taskMap.get(task.plantId) || [];
        plantTasks.push(task);
        taskMap.set(task.plantId, plantTasks);
    });

    return plants.map((plant): PlantTaskData => {
        const allPlantTasks = taskMap.get(plant.id) || [];
        
        const relevantTasks = allPlantTasks.filter(task => {
            const dueDate = new Date(task.nextRunAt);
            return dueDate <= periodEnd;
        });

        if (relevantTasks.length === 0) {
            return { plant, status: 'completed', tasks: [] };
        }

        const incompleteTasks = relevantTasks.filter(t => !t.completedAt);
        const totalRelevantCount = relevantTasks.length;
        const incompleteCount = incompleteTasks.length;

        let status: TaskStatus;
        if (incompleteCount === 0) {
            status = 'completed';
        } else if (incompleteCount < totalRelevantCount) {
            status = 'partial';
        } else {
            status = 'pending';
        }
        
        const sortedIncompleteTasks = incompleteTasks.sort((a,b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime());

        return { plant, status, tasks: sortedIncompleteTasks };
    }).sort((a, b) => {
        const statusOrder = { pending: 0, partial: 1, completed: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return a.plant.nickname?.localeCompare(b.plant.nickname || '') || a.plant.commonName?.localeCompare(b.plant.commonName || '') || 0;
    });
  }, [tasks, plants, activeTab]);

  const handleCompleteTask = async (taskId: string) => {
    try {
        const { updatedTask, newTask } = await db.markTaskComplete(taskId);
        
        const newTaskList = tasks.map(t => t.id === taskId ? updatedTask : t);
        if (newTask) {
            newTaskList.push(newTask);
        }
        setTasks(newTaskList);
    } catch (error) {
        console.error("Failed to complete task:", error);
        alert("Could not complete the task. It may have already been completed.");
    }
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

  const hasPendingOrPartial = plantData.some(p => p.status === 'pending' || p.status === 'partial');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tasks Overview</h1>
      
      <div className="flex space-x-2 rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
          <TabButton tab="today" label="Today's Tasks" />
          <TabButton tab="week" label="This Week's Tasks" />
      </div>

      {loading ? <Spinner /> : (
        <div className="space-y-4">
            {plantData.length > 0 ? plantData.map(data => (
                <PlantTaskCard key={data.plant.id} data={data} onCompleteTask={handleCompleteTask} />
            )) : (
                 <Card>
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-10 px-4">
                        You have no plants yet. Add one to start tracking tasks!
                    </p>
                </Card>
            )}
             {!hasPendingOrPartial && !loading && plantData.length > 0 && (
                <Card>
                     <div className="p-10 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h2 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-300">All Caught Up!</h2>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">You have no pending tasks for this period.</p>
                    </div>
                </Card>
            )}
        </div>
      )}
    </div>
  );
};