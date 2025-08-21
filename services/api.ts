import { GoogleGenAI, Type } from "@google/genai";
import type { Plant, CareProfile, Photo, Task, PlantIdentificationResult, AIHistory, Category } from '../types';

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
      // Assumes `import.meta.env.VITE_API_KEY` is available in the execution environment.
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
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
        // rethrow other errors with their original messages (which might be keys already)
        throw error;
      }
      throw new Error("An unexpected error occurred during plant identification.");
    }
  },

  askAboutPlant: async (
    question: string,
    plantContext: { species: string; commonName?: string },
    base64Image?: string | null
  ): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
      const model = 'gemini-2.5-flash';
      
      const prompt = `
        You are an expert botanist and plant care assistant called Plantia AI.
        A user has a question about their plant, a ${plantContext.commonName || ''} (${plantContext.species}).
        
        The user's question is: "${question}"

        Analyze the question and the provided image (if any) to give a helpful, clear, and actionable answer. 
        Structure your response for readability. If you suggest actions, use a bulleted or numbered list.
        Be concise and focus on solving the user's problem.
      `;

      const textPart = { text: prompt };
      const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
      
      if (base64Image) {
        const imagePart = {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1],
          },
        };
        parts.push(imagePart);
      }
      parts.push(textPart);

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: parts },
      });

      const responseText = response.text.trim();
      if (!responseText) {
        throw new Error("Received an empty response from the AI service.");
      }
      return responseText;

    } catch (error) {
      console.error("Error asking about plant:", error);
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error("The Google AI API key is invalid or missing. Please check your configuration.");
        }
        throw error;
      }
      throw new Error("An unexpected error occurred while asking the AI.");
    }
  },
};


// --- IndexedDB Service ---

const DB_NAME = 'PlantiaDB';
const DB_VERSION = 3; // Incremented version for schema change
const STORES = ['plants', 'careProfiles', 'photos', 'tasks', 'settings', 'aiHistory', 'categories'];

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
             if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('aiHistory')) {
                const historyStore = db.createObjectStore('aiHistory', { keyPath: 'id' });
                historyStore.createIndex('plantId', 'plantId', { unique: false });
            }
            if (!db.objectStoreNames.contains('categories')) {
                db.createObjectStore('categories', { keyPath: 'id' });
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
        const history = await promisifyRequest(tx.objectStore('aiHistory').index('plantId').getAll(plantId));

        return {
            plant,
            careProfile: careProfile || null,
            photos: photos.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()),
            tasks: tasks.sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime()),
            history: history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        };
    },

    addPlant: async (data: {
        identification: PlantIdentificationResult;
        nickname?: string;
        location?: string;
        categoryId?: string;
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
            categoryId: data.categoryId,
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
        const historyIndex = tx.objectStore('aiHistory').index('plantId');
        
        const careReq = careIndex.getAllKeys(plantId);
        careReq.onsuccess = () => careReq.result.forEach(key => tx.objectStore('careProfiles').delete(key));

        const photosReq = photosIndex.getAllKeys(plantId);
        photosReq.onsuccess = () => photosReq.result.forEach(key => tx.objectStore('photos').delete(key));

        const tasksReq = tasksIndex.getAllKeys(plantId);
        tasksReq.onsuccess = () => tasksReq.result.forEach(key => tx.objectStore('tasks').delete(key));

        const historyReq = historyIndex.getAllKeys(plantId);
        historyReq.onsuccess = () => historyReq.result.forEach(key => tx.objectStore('aiHistory').delete(key));

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
  
    markTaskComplete: async (taskId: string): Promise<{ updatedTask: Task; newTask?: Task }> => {
        const db = await getDb();
        const tx = db.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');
        const task = await promisifyRequest(store.get(taskId));

        if (!task) {
          throw new Error("Task not found.");
        }
        
        if (task.completedAt) {
            console.warn(`Task ${taskId} was already completed. Ignoring.`);
            return { updatedTask: task };
        }

        const now = new Date();
        const updatedTask: Task = { ...task, completedAt: now.toISOString() };
        store.put(updatedTask);

        let newTask: Task | undefined = undefined;
        const RECURRENCE_DAYS: Partial<Record<Task['type'], number>> = {
          water: 7,
          fertilize: 30,
        };

        const recurrenceDays = RECURRENCE_DAYS[task.type];

        if (recurrenceDays) {
          const newNextRunAt = new Date(now.getTime() + recurrenceDays * 24 * 60 * 60 * 1000);

          newTask = {
            id: `task_${Date.now()}_${Math.random()}`,
            plantId: task.plantId,
            type: task.type,
            title: task.title,
            notes: task.notes,
            nextRunAt: newNextRunAt.toISOString(),
          };
          store.add(newTask);
        }

        await promisifyTransaction(tx);
        return { updatedTask, newTask };
    },

    addAIHistory: async (data: Omit<AIHistory, 'id'>): Promise<AIHistory> => {
        const db = await getDb();
        const tx = db.transaction('aiHistory', 'readwrite');
        const newHistory: AIHistory = {
            id: `ai_${Date.now()}`,
            ...data,
        };
        await promisifyRequest(tx.objectStore('aiHistory').add(newHistory));
        await promisifyTransaction(tx);
        return newHistory;
    },

    // --- Category Methods ---
    getCategories: async (): Promise<Category[]> => {
        const db = await getDb();
        const tx = db.transaction('categories', 'readonly');
        const store = tx.objectStore('categories');
        const categories = await promisifyRequest(store.getAll());
        return categories.sort((a, b) => a.name.localeCompare(b.name));
    },

    addCategory: async (name: string): Promise<Category> => {
        const db = await getDb();
        const tx = db.transaction('categories', 'readwrite');
        const newCategory: Category = {
            id: `cat_${Date.now()}`,
            name,
            createdAt: new Date().toISOString(),
        };
        await promisifyRequest(tx.objectStore('categories').add(newCategory));
        return newCategory;
    },

    deleteCategory: async (categoryId: string): Promise<void> => {
        const db = await getDb();
        const tx = db.transaction(['categories', 'plants'], 'readwrite');
        
        tx.objectStore('categories').delete(categoryId);

        const plantStore = tx.objectStore('plants');
        const cursorReq = plantStore.openCursor();
        
        await new Promise((resolve, reject) => {
            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (cursor) {
                    if (cursor.value.categoryId === categoryId) {
                        const updateData = cursor.value;
                        delete updateData.categoryId;
                        cursor.update(updateData);
                    }
                    cursor.continue();
                } else {
                    resolve(void 0);
                }
            };
            cursorReq.onerror = () => reject(cursorReq.error);
        });

        await promisifyTransaction(tx);
    },

    clearAllData: async (): Promise<void> => {
        const db = await getDb();
        const tx = db.transaction(STORES, 'readwrite');
        for (const storeName of STORES) {
            tx.objectStore(storeName).clear();
        }
        await promisifyTransaction(tx);
    },

    getSetting: async <T>(key: string): Promise<T | undefined> => {
        const db = await getDb();
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const result = await promisifyRequest(store.get(key));
        return result ? result.value : undefined;
    },

    setSetting: async <T>(key: string, value: T): Promise<void> => {
        const db = await getDb();
        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        await promisifyRequest(store.put({ key, value }));
        await promisifyTransaction(tx);
    }
};