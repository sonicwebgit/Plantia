import React, { useState, useEffect, useCallback } from 'react';
import { db, geminiService } from '../services/api';
import type { Plant, CareProfile, Photo, Task, AIHistory, Category } from '../types';
import { Card, Button, Spinner, Badge } from './ui';
import { fileToBase64, resizeImage } from '../utils/helpers';

interface PlantDetailsData {
  plant: Plant;
  careProfile: CareProfile | null;
  photos: Photo[];
  tasks: Task[];
  history: AIHistory[];
}

const CareProfileSection = ({ careProfile }: { careProfile: CareProfile | null }) => {
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

const PhotoGrid = ({ initialPhotos, plantId, onPhotoAdded }: { initialPhotos: Photo[], plantId: string, onPhotoAdded: (photo: Photo) => void }) => {
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

const TaskList = ({ initialTasks, plantId, onTasksUpdated }: { initialTasks: Task[], plantId: string, onTasksUpdated: (tasks: Task[]) => void }) => {
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
                    {pendingTasks.length > 0 ? pendingTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                           <div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{task.title}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">{`Due: ${new Date(task.nextRunAt).toLocaleDateString()}`}</div>
                           </div>
                           <Button variant="secondary" size="sm" onClick={() => handleComplete(task.id)}>Mark as Done</Button>
                        </div>
                    )) : (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-4">No pending tasks. Well done!</p>
                    )}
                </div>
            </Card>
        </div>
    );
};

const HistoryItem = ({ item }: { item: AIHistory }) => {
    return (
        <details className="group overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 open:shadow-md transition-shadow">
            <summary className="p-4 flex justify-between items-center cursor-pointer list-none">
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-4">{item.question}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 dark:text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </summary>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                 {item.photoUrl && <img src={item.photoUrl} alt="User provided context" className="rounded-md max-h-64 w-auto" />}
                 <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: item.answer.replace(/\n/g, '<br />') }}>
                 </div>
            </div>
        </details>
    )
};


const AskAISection = ({ plant, history, onHistoryAdded }: { plant: Plant, history: AIHistory[], onHistoryAdded: (item: AIHistory) => void }) => {
    const [question, setQuestion] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const resizedFile = await resizeImage(file, 512, 512);
            const base64 = await fileToBase64(resizedFile);
            setImage(base64);
        } catch (err) {
            console.error(err);
            setError("Could not read or process the selected file.");
            setStatus('error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        setStatus('loading');
        setError(null);
        
        try {
            const aiResponse = await geminiService.askAboutPlant(
                question,
                { species: plant.species, commonName: plant.commonName },
                image
            );
            
            const newItem = await db.addAIHistory({
                plantId: plant.id,
                question: question,
                answer: aiResponse,
                photoUrl: image || undefined,
                createdAt: new Date().toISOString()
            });

            onHistoryAdded(newItem);
            
            // Reset form
            setQuestion('');
            setImage(null);
            if(fileInputRef.current) fileInputRef.current.value = '';
            setStatus('idle');

        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred while asking the AI.';
            setError(message);
            setStatus('error');
        }
    };

    const isLoading = status === 'loading';

    return (
        <div>
            <h2 className="text-xl font-bold mb-3">Ask Plantia AI</h2>

            {history.length > 0 && (
                <div className="space-y-2 mb-6">
                    <h3 className="text-base font-semibold text-slate-600 dark:text-slate-400">Conversation History</h3>
                    {history.map(item => <HistoryItem key={item.id} item={item} />)}
                </div>
            )}
            
            <Card>
                <div className="p-4 sm:p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {`Have a question about your ${plant.nickname || plant.commonName}? Describe the issue, add a photo if helpful, and our AI assistant will provide advice.`}
                        </p>
                        <div>
                            <label htmlFor="ai-question" className="sr-only">Your Question</label>
                            <textarea
                                id="ai-question"
                                rows={4}
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="e.g., Why are the leaves turning yellow and crispy at the edges?"
                                className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-base"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                           <div className="flex items-center gap-3">
                               <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                                   {image ? 'Change Photo' : 'Add Photo'}
                               </Button>
                               <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                               {image && (
                                   <div className="relative">
                                       <img src={image} alt="Question preview" className="h-10 w-10 rounded object-cover" />
                                       <button type="button" onClick={() => { setImage(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-slate-600 text-white flex items-center justify-center text-xs" aria-label="Remove image">&times;</button>
                                   </div>
                               )}
                           </div>
                            <Button type="submit" disabled={isLoading || !question.trim()}>
                                {isLoading ? 'Thinking...' : 'Ask AI'}
                            </Button>
                        </div>
                    </form>

                    {status === 'loading' && (
                         <div className="text-center p-4 space-y-3">
                            <Spinner />
                        </div>
                    )}
                    
                    {status === 'error' && (
                        <div className="mt-4 space-y-4">
                            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                                <h3 className="font-bold">AI Assistant Error</h3>
                                <p className="text-sm">{error}</p>
                            </div>
                            <Button variant="secondary" onClick={() => { setError(null); setStatus('idle'); }}>Try Again</Button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};


const DangerZone = ({ plant, onDeleted }: { plant: Plant, onDeleted: () => void }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        const confirmMessage = `Are you sure you want to delete "${plant.nickname || plant.commonName}"? This action is permanent and cannot be undone.`;
        const isConfirmed = window.confirm(confirmMessage);
        
        if (isConfirmed) {
            setIsDeleting(true);
            try {
                await db.deletePlant(plant.id);
                onDeleted();
            } catch (error) {
                console.error("Failed to delete plant:", error);
                alert("Could not delete the plant. Please try again.");
                setIsDeleting(false);
            }
        }
    };

    return (
         <Card>
            <div className="p-6 border-t border-red-200 dark:border-red-900/50">
                <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3">Danger Zone</h2>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-medium">Delete this plant</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Permanently remove this plant and all its data, including photos and tasks.</p>
                    </div>
                    <Button variant="danger" onClick={handleDelete} disabled={isDeleting} className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0">
                        {isDeleting ? 'Deleting...' : 'Delete Plant'}
                    </Button>
                </div>
            </div>
        </Card>
    )
}

export const PlantDetail = ({ plantId }: { plantId: string }) => {
    const [details, setDetails] = useState<PlantDetailsData | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDetails = useCallback(async () => {
        setLoading(true);
        const [data, catList] = await Promise.all([
            db.getPlantDetails(plantId),
            db.getCategories()
        ]);
        setDetails(data);
        setCategories(catList);
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

    const { plant, careProfile, photos, tasks, history } = details;

    const categoryName = plant.categoryId ? categories.find(c => c.id === plant.categoryId)?.name : null;

    return (
        <div className="space-y-8">
            <div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{plant.nickname || plant.commonName}</h1>
                    {categoryName && <Badge className="text-base py-1 px-3">{categoryName}</Badge>}
                </div>
                <p className="text-lg text-slate-500 dark:text-slate-400 italic mt-1">{plant.species} {plant.confidence && `(${(plant.confidence * 100).toFixed(0)}% confidence)`}</p>
            </div>
            
            <CareProfileSection careProfile={careProfile} />
            <PhotoGrid initialPhotos={photos} plantId={plant.id} onPhotoAdded={(photo) => setDetails(d => d ? {...d, photos: [photo, ...d.photos]} : null)} />
            <TaskList initialTasks={tasks} plantId={plant.id} onTasksUpdated={(newTasks) => setDetails(d => d ? {...d, tasks: newTasks} : null)} />

            <AskAISection 
                plant={plant} 
                history={history}
                onHistoryAdded={(newItem) => setDetails(d => d ? {...d, history: [newItem, ...d.history]} : null)} 
            />

            <DangerZone plant={plant} onDeleted={() => window.location.hash = '#/'} />
        </div>
    );
};