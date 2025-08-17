
import React, { useState, useCallback, useRef } from 'react';
import { geminiService, db } from '../services/api';
import type { PlantIdentificationResult } from '../types';
import { fileToBase64, resizeImage } from '../utils/helpers';
import { Card, Button, Spinner } from './ui';

type Status = 'idle' | 'identifying' | 'identified' | 'saving' | 'error';

const UploadDropzone = ({ onFile, disabled }: { onFile: (file: File) => void, disabled: boolean }) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFile(e.target.files[0]);
        }
    };

    const handleDragEvent = (e: React.DragEvent, isEntering: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        if(!disabled) setIsDragging(isEntering);
    };

    const handleDrop = (e: React.DragEvent) => {
        handleDragEvent(e, false);
        if (e.dataTransfer.files && e.dataTransfer.files[0] && !disabled) {
            onFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div 
            className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50'} ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-emerald-400 dark:hover:border-emerald-600'}`}
            onDragEnter={(e) => handleDragEvent(e, true)}
            onDragLeave={(e) => handleDragEvent(e, false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !disabled && inputRef.current?.click()}
        >
            <input type="file" accept="image/*" className="hidden" ref={inputRef} onChange={handleFileChange} disabled={disabled} />
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400"><span className="font-semibold text-emerald-600 dark:text-emerald-500">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">PNG, JPG, or WEBP</p>
        </div>
    );
};

export const AddPlant = () => {
    const [image, setImage] = useState<string | null>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [result, setResult] = useState<PlantIdentificationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nickname, setNickname] = useState('');

    const handleFileSelect = async (file: File) => {
        try {
            // Resize the image to a maximum of 1024x1024 to save space in localStorage
            // and reduce upload size for the Gemini API.
            const resizedFile = await resizeImage(file, 1024, 1024);
            const base64 = await fileToBase64(resizedFile);
            setImage(base64);
            handleIdentify(base64);
        } catch (err) {
            console.error("Error processing file:", err);
            setError('Could not read or process the selected file.');
            setStatus('error');
        }
    };
    
    const handleIdentify = async (base64Image: string) => {
        if (!base64Image) return;
        setStatus('identifying');
        setError(null);
        try {
            const data = await geminiService.identifyPlant(base64Image);
            setResult(data);
            setNickname(data.commonName);
            setStatus('identified');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setStatus('error');
        }
    };

    const handleSave = async () => {
        if (!result) return;
        setStatus('saving');
        setError(null); // Clear previous errors
        try {
            // Save plant data and initial photo in a single atomic operation
            const plant = await db.addPlant({
                identification: result,
                nickname,
                initialPhotoUrl: image
            });
            window.location.hash = `#/plant/${plant.id}`;
        } catch (err) {
            console.error("Error saving plant:", err);
            const defaultMessage = 'Failed to save the plant. The device storage might be full.';
            setError(err instanceof Error ? err.message : defaultMessage);
            setStatus('error');
        }
    };

    const handleReset = () => {
        setImage(null);
        setStatus('idle');
        setResult(null);
        setError(null);
        setNickname('');
    };

    const isLoading = status === 'identifying' || status === 'saving';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Add a New Plant</h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400">Upload a photo, and our AI will identify it and create a care plan.</p>
            </div>

            <Card>
                <div className="p-6">
                    {!image && <UploadDropzone onFile={handleFileSelect} disabled={isLoading} />}
                    {image && (
                         <div className="grid md:grid-cols-2 gap-6 items-start">
                             <div className="space-y-4">
                                <img src={image} alt="Plant preview" className="rounded-lg w-full object-cover aspect-square" />
                                <Button variant="secondary" onClick={handleReset} disabled={isLoading} className="w-full">
                                    Use a Different Photo
                                </Button>
                             </div>

                             <div className="space-y-4">
                                {status === 'identifying' && (
                                    <div className="text-center p-8 space-y-3">
                                        <Spinner />
                                        <p className="font-semibold text-emerald-700 dark:text-emerald-400">Identifying your plant...</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">This can take a moment. Our AI is analyzing the leaves, petals, and stems.</p>
                                    </div>
                                )}
                                {status === 'error' && (
                                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                                        <h3 className="font-bold">Identification Failed</h3>
                                        <p className="text-sm">{error}</p>
                                    </div>
                                )}
                                {result && (status === 'identified' || status === 'saving' || status === 'error') && (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">AI Identified as:</p>
                                            <h2 className="text-2xl font-bold">{result.commonName}</h2>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 italic">{result.species} ({(result.confidence * 100).toFixed(0)}% confidence)</p>
                                        </div>
                                        <div>
                                            <label htmlFor="nickname" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nickname for your plant:</label>
                                            <input type="text" id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" />
                                        </div>
                                        <div className="text-sm p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border dark:border-slate-700">
                                            <h4 className="font-semibold mb-2">Initial Care Summary:</h4>
                                            <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-300">
                                                <li><b>Sunlight:</b> {result.careProfile.sunlight}</li>
                                                <li><b>Watering:</b> {result.careProfile.watering}</li>
                                            </ul>
                                        </div>
                                        <Button onClick={handleSave} disabled={isLoading} className="w-full">
                                            {status === 'saving' ? 'Saving...' : 'Save Plant to Collection'}
                                        </Button>
                                    </div>
                                )}
                             </div>
                         </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
