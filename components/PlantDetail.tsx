import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/api';
import type { Plant, CareProfile, Photo, Task } from '../types';
import { Card, Button, Spinner } from './ui';
import { fileToBase64 } from '../utils/helpers';

interface PlantDetailsData {
  plant: Plant;
  careProfile: CareProfile | null;
  photos: Photo[];
  tasks: Task[];
}

const CareProfileSection: React.FC<{ careProfile: CareProfile | null }> = ({ careProfile }) => {
    if (!careProfile) return null;
    const details = [
        { label: 'Sunlight', value: careProfile.sunlight },
        { label: 'Watering', value: careProfile.watering },
        { label: 'Soil', value: careProfile.soil },
        { label: 'Fertilizer', value: careProfile.fertilizer },
        { label: 'Temp.', value: careProfile.tempRange },
        { label: 'Humidity', value: careProfile.humidity },
    ];
    return (
        <div>
            <h2 className="text-xl font-bold mb-3">Care Profile</h2>
            <Card>
                <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {details.map(d => (
                        <div key={d.label}>
                            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">{d.label}</div>
                            <div className="text-md text-slate-800 dark:text-slate-200">{d.value}</div>
                        </div>
                    ))}
                </div>
                {careProfile.tips && <div className="px-4 py-3 sm:px-6 sm:py-4 bg-emerald-50 dark:bg-emerald-900/50 border-t border-slate-200 dark:border-slate-800 text-sm text-emerald-800 dark:text-emerald-300">{careProfile.tips}</div>}
            </Card>
        </div>
    );
};

const PhotoGrid: React.FC<{ initialPhotos: Photo[], plantId: string, onPhotoAdded: (photo: Photo) => void }> = ({ initialPhotos, plantId, onPhotoAdded }) => {
    const [photos, setPhotos] = useState(initialPhotos);
    const [uploading, setUploading] = useState(false);
    
    const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const base64 = await fileToBase64(file);
            const newPhoto = await db.addPhoto(plantId, base64);
            setPhotos([newPhoto, ...photos]);
            onPhotoAdded(newPhoto);
        } catch (error) {
            console.error("Failed to add photo", error);
        } finally {
            setUploading(false);
        }
    };
    
    return (
        <div>
            <h2 className="text-xl font-bold mb-3">Progress Photos</h2>
            <Card>
                <div className="p-4">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {photos.map(p => <img key={p.id} src={p.url} alt={`Plant on ${new Date(p.takenAt).toLocaleDateString()}`} className="w-full h-24 sm:h-32 object-cover rounded-md" />)}
                        <label className="flex items-center justify-center w-full h-24 sm:h-32 border-2 border-dashed rounded-md cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 bg-slate-50 dark:bg-slate-800/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            <input type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} disabled={uploading}/>
                        </label>
                    </div>
                    {uploading && <div className="text-sm mt-2 text-slate-500 dark:text-slate-400">Uploading...</div>}
                </div>
            </Card>
        </div>
    );
};

const TaskList: React.FC<{ initialTasks: Task[], plantId: string, onTasksUpdated: (tasks: Task[]) => void }> = ({ initialTasks, plantId, onTasksUpdated }) => {
    const [tasks, setTasks] = useState(initialTasks);
    
    const handleComplete = async (taskId: string) => {
        const updatedTask = await db.updateTask(taskId, { completedAt: new Date().toISOString() });
        if(updatedTask) {
            const newTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
            setTasks(newTasks);
            onTasksUpdated(newTasks);
        }
    };
    
    const pendingTasks = tasks.filter(t => !t.completedAt);

    return (
        <div>
            <h2 className="text-xl font-bold mb-3">Tasks & Reminders</h2>
             <Card>
                <div className="p-4 space-y-3">
                    {pendingTasks.length > 0 ? pendingTasks.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                           <div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{t.title}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">Due: {new Date(t.nextRunAt).toLocaleDateString()}</div>
                           </div>
                           <Button variant="secondary" size="sm" onClick={() => handleComplete(t.id)}>Mark as Done</Button>
                        </div>
                    )) : (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-4">No pending tasks. Well done!</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

export const PlantDetail: React.FC<{ plantId: string }> = ({ plantId }) => {
    const [details, setDetails] = useState<PlantDetailsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchDetails = useCallback(async () => {
        setLoading(true);
        const data = await db.getPlantDetails(plantId);
        setDetails(data);
        setLoading(false);
    }, [plantId]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);
    
    if (loading) {
        return <Spinner />;
    }

    if (!details) {
        return <div className="text-center py-10">
            <h2 className="text-2xl font-bold">Plant Not Found</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">The plant you are looking for does not exist.</p>
            <a href="#/" className="mt-4 inline-block text-emerald-600 dark:text-emerald-500 hover:underline">Go to Dashboard</a>
        </div>;
    }

    const { plant, careProfile, photos, tasks } = details;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{plant.nickname || plant.commonName}</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 italic">{plant.species} {plant.confidence && `(${(plant.confidence * 100).toFixed(0)}% confidence)`}</p>
            </div>
            
            <CareProfileSection careProfile={careProfile} />
            <PhotoGrid initialPhotos={photos} plantId={plant.id} onPhotoAdded={(photo) => setDetails(d => d ? {...d, photos: [photo, ...d.photos]} : null)} />
            <TaskList initialTasks={tasks} plantId={plant.id} onTasksUpdated={(newTasks) => setDetails(d => d ? {...d, tasks: newTasks} : null)} />
        </div>
    );
};