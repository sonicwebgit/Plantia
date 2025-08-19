import { GoogleGenAI, Type } from "@google/genai";
import type { Plant, CareProfile, Photo, Task, PlantIdentificationResult } from '../types';

// --- Gemini API Service ---

const careProfileSchema = {
    type: Type.OBJECT,
    properties: {
        sunlight: { type: Type.STRING, description: "e.g., Bright indirect light" },
        watering: { type: Type.STRING, description: "e.g., Every 7-10 days; let top 2-3cm dry" },
        soil: { type: Type.STRING, description: "e.g., Well-draining potting mix" },
        fertilizer: { type: Type.STRING, description: "e.g., Balanced liquid feed monthly (spring/summer)" },
        tempRange: { type: Type.STRING, description: "e.g., 18-24°C" },
        humidity: { type: Type.STRING, description: "e.g., Prefers high humidity" },
        tips: { type: Type.STRING, description: "One or two concise, helpful tips." },
    },
    required: ["sunlight", "watering", "soil", "fertilizer", "tempRange", "humidity"]
};

const identificationSchema = {
    type: Type.OBJECT,
    properties: {
        species: { type: Type.STRING, description: "The scientific (latin) name of the plant." },
        commonName: { type: Type.STRING, description: "The most common name for the plant." },
        confidence: { type: Type.NUMBER, description: "A confidence score from 0.0 to 1.0 on the identification." },
        careProfile: careProfileSchema,
    },
    required: ["species", "commonName", "confidence", "careProfile"]
};


export const geminiService = {
  identifyPlant: async (base64Image: string): Promise<PlantIdentificationResult> => {
    try {
      // Use API key directly from environment variables as per guidelines.
      // Assumes `process.env.API_KEY` is available in the execution environment.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-2.5-flash';

      const imagePart = {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image.split(',')[1],
        },
      };

      const prompt = `
        Identify the plant in this image. Provide its scientific name, common name, a confidence score between 0.0 and 1.0, 
        and a detailed care profile. Be accurate and concise.
      `;
      
      const textPart = { text: prompt };

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: identificationSchema,
        },
      });
      
      try {
        const jsonString = response.text.trim();
        if (!jsonString) {
            throw new Error("Received an empty response from the AI service.");
        }
        const result = JSON.parse(jsonString);
        return result as PlantIdentificationResult;
      } catch (parseError) {
        console.error("Error parsing JSON response from Gemini:", parseError);
        console.error("Raw response text from Gemini:", response.text);
        throw new Error("The AI service returned an invalid response. Please try again.");
      }

    } catch (error) {
      console.error("Error identifying plant:", error);
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
           throw new Error("The Google AI API key is invalid or missing. Please check your configuration.");
        }
        throw error;
      }
      throw new Error("An unexpected error occurred during plant identification.");
    }
  },
};


// --- IndexedDB Service ---

const DB_NAME = 'PlantiaDB';
const DB_VERSION = 1;
const STORES = ['plants', 'careProfiles', 'photos', 'tasks'];

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('plants')) {
                db.createObjectStore('plants', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('careProfiles')) {
                const careStore = db.createObjectStore('careProfiles', { keyPath: 'id' });
                careStore.createIndex('plantId', 'plantId', { unique: false });
            }
            if (!db.objectStoreNames.contains('photos')) {
                const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
                photoStore.createIndex('plantId', 'plantId', { unique: false });
            }
            if (!db.objectStoreNames.contains('tasks')) {
                const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
                taskStore.createIndex('plantId', 'plantId', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
            reject("IndexedDB error: " + (event.target as IDBOpenDBRequest).error);
        };
    });
    return dbPromise;
};

// Helper function to promisify IDBRequest
const promisifyRequest = <T>(request: IDBRequest<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Helper function to promisify IDBTransaction
const promisifyTransaction = (tx: IDBTransaction): Promise<void> => {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const db = {
    getPlants: async (): Promise<Plant[]> => {
        const db = await getDb();
        const tx = db.transaction('plants', 'readonly');
        const store = tx.objectStore('plants');
        const plants = await promisifyRequest(store.getAll());
        return plants.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    getTasks: async (): Promise<Task[]> => {
        const db = await getDb();
        const tx = db.transaction('tasks', 'readonly');
        const store = tx.objectStore('tasks');
        return promisifyRequest(store.getAll());
    },

    getPhotos: async (): Promise<Photo[]> => {
        const db = await getDb();
        const tx = db.transaction('photos', 'readonly');
        const store = tx.objectStore('photos');
        return promisifyRequest(store.getAll());
    },

    getPlantDetails: async (plantId: string) => {
        const db = await getDb();
        const tx = db.transaction(STORES, 'readonly');

        const plant = await promisifyRequest(tx.objectStore('plants').get(plantId));
        if (!plant) return null;

        const careProfile = await promisifyRequest(tx.objectStore('careProfiles').index('plantId').get(plantId));
        const photos = await promisifyRequest(tx.objectStore('photos').index('plantId').getAll(plantId));
        const tasks = await promisifyRequest(tx.objectStore('tasks').index('plantId').getAll(plantId));

        return {
            plant,
            careProfile: careProfile || null,
            photos: photos.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()),
            tasks: tasks.sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime()),
        };
    },

    addPlant: async (data: {
        identification: PlantIdentificationResult;
        nickname?: string;
        location?: string;
        initialPhotoUrl?: string | null;
    }): Promise<Plant> => {
        const db = await getDb();
        const tx = db.transaction(STORES, 'readwrite');
        
        const now = new Date().toISOString();
        const plantId = `plant_${Date.now()}`;

        const newPlant: Plant = {
            id: plantId,
            species: data.identification.species,
            commonName: data.identification.commonName,
            confidence: data.identification.confidence,
            nickname: data.nickname,
            location: data.location,
            createdAt: now,
        };

        const newCareProfile: CareProfile = {
            id: `cp_${Date.now()}`,
            plantId: plantId,
            species: data.identification.species,
            ...data.identification.careProfile,
        };
        
        tx.objectStore('plants').add(newPlant);
        tx.objectStore('careProfiles').add(newCareProfile);

        if (data.initialPhotoUrl) {
            const newPhoto: Photo = {
                id: `photo_${Date.now()}`,
                plantId,
                url: data.initialPhotoUrl,
                notes: "Initial photo",
                takenAt: now,
            };
            tx.objectStore('photos').add(newPhoto);
        }
        
        const defaultTasks: Omit<Task, 'id' | 'plantId'>[] = [
            { type: 'water', title: 'Water Plant', nextRunAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
            { type: 'fertilize', title: 'Fertilize', nextRunAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() }
        ];

        defaultTasks.forEach(task => {
            tx.objectStore('tasks').add({
                id: `task_${Date.now()}_${Math.random()}`,
                plantId: plantId,
                ...task
            });
        });

        await promisifyTransaction(tx);
        return newPlant;
    },
  
    deletePlant: async (plantId: string): Promise<void> => {
        const db = await getDb();
        const tx = db.transaction(STORES, 'readwrite');
        
        tx.objectStore('plants').delete(plantId);

        const careIndex = tx.objectStore('careProfiles').index('plantId');
        const photosIndex = tx.objectStore('photos').index('plantId');
        const tasksIndex = tx.objectStore('tasks').index('plantId');
        
        const careReq = careIndex.getAllKeys(plantId);
        careReq.onsuccess = () => careReq.result.forEach(key => tx.objectStore('careProfiles').delete(key));

        const photosReq = photosIndex.getAllKeys(plantId);
        photosReq.onsuccess = () => photosReq.result.forEach(key => tx.objectStore('photos').delete(key));

        const tasksReq = tasksIndex.getAllKeys(plantId);
        tasksReq.onsuccess = () => tasksReq.result.forEach(key => tx.objectStore('tasks').delete(key));

        await promisifyTransaction(tx);
    },

    addPhoto: async (plantId: string, url: string, notes?: string): Promise<Photo> => {
        const db = await getDb();
        const tx = db.transaction('photos', 'readwrite');
        const newPhoto: Photo = {
            id: `photo_${Date.now()}`,
            plantId,
            url,
            notes,
            takenAt: new Date().toISOString(),
        };
        await promisifyRequest(tx.objectStore('photos').add(newPhoto));
        return newPhoto;
    },
  
    addTask: async (plantId: string, taskData: Omit<Task, 'id' | 'plantId' | 'completedAt'>): Promise<Task> => {
        const db = await getDb();
        const tx = db.transaction('tasks', 'readwrite');
        const newTask: Task = {
            id: `task_${Date.now()}`,
            plantId,
            ...taskData
        };
        await promisifyRequest(tx.objectStore('tasks').add(newTask));
        return newTask;
    },
  
    updateTask: async (taskId: string, updates: Partial<Pick<Task, 'completedAt'>>): Promise<Task | null> => {
        const db = await getDb();
        const tx = db.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');
        const task = await promisifyRequest(store.get(taskId));
        if (!task) return null;

        const updatedTask = { ...task, ...updates };
        await promisifyRequest(store.put(updatedTask));
        return updatedTask;
    },

    clearAllData: async (): Promise<void> => {
        const db = await getDb();
        const tx = db.transaction(STORES, 'readwrite');
        for (const storeName of STORES) {
            tx.objectStore(storeName).clear();
        }
        await promisifyTransaction(tx);
    }
};