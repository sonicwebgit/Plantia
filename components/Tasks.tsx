import React, { useState, useEffect } from 'react';
import { db } from '../services/api';
import type { Plant, Task } from '../types';
import { Card, Spinner } from './ui';

interface TaskWithPlant extends Task {
  plant: Plant;
}

export const Tasks = () => {
  const [tasks, setTasks] = useState<TaskWithPlant[]>([]);
  const [loading, setLoading] = useState(true);

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

  const upcomingTasks = tasks
    .filter(t => !t.completedAt)
    .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime());

  const completedTasks = tasks
    .filter(t => t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 10); // show last 10 completed

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">All Tasks</h1>
      
      {loading ? <Spinner /> : (
        <>
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">Upcoming</h2>
                <Card>
                  <div className="p-4 space-y-3">
                      {upcomingTasks.length > 0 ? upcomingTasks.map(task => (
                          <a key={task.id} href={`#/plant/${task.plant!.id}`} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                              <div>
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">{task.title}</div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400">For: <span className="font-medium">{task.plant!.nickname || task.plant!.commonName}</span></div>
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400 text-right">
                                  Due: {new Date(task.nextRunAt).toLocaleDateString()}
                              </div>
                          </a>
                      )) : (
                          <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">No upcoming tasks. You're all caught up!</p>
                      )}
                  </div>
                </Card>
            </div>

            {completedTasks.length > 0 && (
                 <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">Recently Completed</h2>
                    <Card>
                      <div className="p-4 space-y-3">
                          {completedTasks.map(task => (
                              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 opacity-60">
                                  <div>
                                      <div className="font-semibold text-slate-800 dark:text-slate-300 line-through">{task.title}</div>
                                      <div className="text-sm text-slate-500 dark:text-slate-400">For: {task.plant!.nickname || task.plant!.commonName}</div>
                                  </div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400 text-right">
                                      Done: {new Date(task.completedAt!).toLocaleDateString()}
                                  </div>
                              </div>
                          ))}
                      </div>
                    </Card>
                </div>
            )}
        </>
      )}
    </div>
  );
};
