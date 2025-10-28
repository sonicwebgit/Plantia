import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { Plant, CareProfile, Photo, Task, AIHistory, Category, PlantIdentificationResult, StoredData } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- Gemini AI Service ---

// FIX: Per Gemini API guidelines, the API key must be obtained from an environment variable.
// For Vite projects, this is done via `import.meta.env`.
const apiKey = import.meta.env.VITE_API_KEY;
if (!apiKey) {
    // This provides a clear, developer-friendly error if the VITE_API_KEY is missing.
    const rootEl = document.getElementById('root');
    if (rootEl) {
        rootEl.innerHTML = `
            <div style="font-family: sans-serif; padding: 2rem; text-align: center; background-color: #fff5f5; color: #c53030; border: 1px solid #fc8181; border-radius: 0.5rem; margin: 2rem;">
                <h1 style="font-size: 1.5rem; font-weight: bold;">Gemini API Key Error</h1>
                <p>The Gemini API key is missing. Please ensure the <code>VITE_API_KEY</code> environment variable is configured for your deployment.</p>
                <p style="font-size: 0.8rem; margin-top: 1rem;">This is a developer message. The app will not function correctly until this is resolved.</p>
            </div>
        `;
    }
    throw new Error("Gemini API key is missing. Please ensure VITE_API_KEY is configured.");
}
const ai = new GoogleGenAI({ apiKey });

// FIX: Export `geminiService` to make it available for use in other modules.
export const geminiService = {
  identifyPlant: async (base64Image: string): Promise<PlantIdentificationResult> => {
    const model = 'gemini-2.5-flash';
    const mimeType = base64Image.substring(base64Image.indexOf(":") + 1, base64Image.indexOf(";"));
    const imageData = base64Image.substring(base64Image.indexOf(",") + 1);

    const prompt = `
      Identify the plant in the image. Provide its common name, scientific name (species), and your confidence level (0.0 to 1.0).
      Also, generate a concise care profile for a beginner, including:
      - sunlight: (e.g., "Bright, indirect light")
      - watering: (e.g., "Water every 1-2 weeks, allowing soil to dry out between waterings.")
      - soil: (e.g., "Well-draining potting mix")
      - fertilizer: (e.g., "Feed monthly during spring/summer.")
      - tempRange: (e.g., "18-29°C (65-85°F)")
      - humidity: (e.g., "Average home humidity is fine.")
      - tips: (A single, brief, helpful tip for this plant.)
      Respond ONLY with a valid JSON object that conforms to the provided schema. Do not include any other text, markdown, or explanations.
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        species: { type: Type.STRING, description: "Scientific name of the plant." },
        commonName: { type: Type.STRING, description: "Common name of the plant." },
        confidence: { type: Type.NUMBER, description: "Confidence score from 0.0 to 1.0." },
        careProfile: {
          type: Type.OBJECT,
          properties: {
            sunlight: { type: Type.STRING },
            watering: { type: Type.STRING },
            soil: { type: Type.STRING },
            fertilizer: { type: Type.STRING },
            tempRange: { type: Type.STRING },
            humidity: { type: Type.STRING },
            tips: { type: Type.STRING },
          },
          required: ["sunlight", "watering", "soil", "fertilizer", "tempRange", "humidity"]
        }
      },
      required: ["species", "commonName", "confidence", "careProfile"]
    };

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imageData } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      const text = response.text.trim();
      if (!text) {
        throw new Error("Received an empty response from the AI service.");
      }
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini Identification Error:", error);
      throw new Error("An unexpected error occurred during plant identification.");
    }
  },

  askAboutPlant: async (question: string, plantInfo: { species: string, commonName?: string }, base64Image: string | null): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const parts: any[] = [];
    
    const prompt = `
      You are a helpful plant care assistant named Plantia.
      A user has a question about their plant, a ${plantInfo.commonName || ''} (${plantInfo.species}).
      Their question is: "${question}"
      ${base64Image ? "They have also provided a photo for context." : ""}
      Provide a helpful, concise, and easy-to-understand answer. Use markdown for formatting (e.g., bullet points with *).
    `;

    parts.push({ text: prompt });

    if (base64Image) {
        const mimeType = base64Image.substring(base64Image.indexOf(":") + 1, base64Image.indexOf(";"));
        const imageData = base64Image.substring(base64Image.indexOf(",") + 1);
        parts.push({ inlineData: { mimeType, data: imageData } });
    }

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts: parts }
        });

        const text = response.text;
        if (!text) {
          throw new Error("Received an empty response from the AI service.");
        }
        return text;
    } catch (error) {
        console.error("Gemini Ask Error:", error);
        throw new Error("An unexpected error occurred while asking the AI.");
    }
  }
};


// --- IndexedDB Service ---

const DB_NAME = 'PlantiaDB';
const DB_VERSION = 1;
const STORES: (keyof StoredData)[] = ['plants', 'careProfiles', 'photos', 'tasks', 'aiHistory', 'categories'];

const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        STORES.forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id' });
            }
        });
    };
});

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function parseFrequency(instruction: string): number {
    let days = 0;
    const lowerInstruction = instruction.toLowerCase();
    const dayMatch = lowerInstruction.match(/every (\d+)-?(\d+)? days/);
    if (dayMatch) {
        days = parseInt(dayMatch[1], 10);
    } else {
        const weekMatch = lowerInstruction.match(/every (\d+)-?(\d+)? weeks?/);
        if (weekMatch) {
            days = parseInt(weekMatch[1], 10) * 7;
        } else if (lowerInstruction.includes('monthly') || lowerInstruction.includes('every 4 weeks')) {
            days = 28;
        } else if (lowerInstruction.includes('bi-weekly') || lowerInstruction.includes('every 2 weeks')) {
            days = 14;
        } else if (lowerInstruction.includes('weekly')) {
            days = 7;
        }
    }
    return days;
}

function createTaskFromProfile(plantId: string, type: 'water' | 'fertilize', title: string, instruction: string): Task | null {
    const days = parseFrequency(instruction);
    if (days > 0) {
        const nextRunAt = new Date();
        nextRunAt.setDate(nextRunAt.getDate() + days);
        return {
            id: uuidv4(),
            plantId,
            type,
            title,
            notes: `Based on care profile: "${instruction}"`,
            nextRunAt: nextRunAt.toISOString()
        };
    }
    return null;
}

export const db = {
    getPlants: async (): Promise<Plant[]> => {
        const db = await dbPromise;
        return promisifyRequest(db.transaction('plants').objectStore('plants').getAll());
    },
    getCategories: async (): Promise<Category[]> => {
        const db = await dbPromise;
        return promisifyRequest(db.transaction('categories').objectStore('categories').getAll());
    },
    getPhotos: async (): Promise<Photo[]> => {
        const db = await dbPromise;
        return promisifyRequest(db.transaction('photos').objectStore('photos').getAll());
    },
    getTasks: async (): Promise<Task[]> => {
        const db = await dbPromise;
        return promisifyRequest(db.transaction('tasks').objectStore('tasks').getAll());
    },

    getPlantDetails: async (plantId: string): Promise<PlantDetailsData | null> => {
        const db = await dbPromise;
        const tx = db.transaction(STORES, 'readonly');
        
        const plant = await promisifyRequest(tx.objectStore('plants').get(plantId)) as Plant | undefined;
        if (!plant) return null;

        const careProfile = await promisifyRequest(tx.objectStore('careProfiles').get(plantId)) as CareProfile | undefined;
        const photos = (await promisifyRequest(tx.objectStore('photos').getAll()) as Photo[]).filter(p => p.plantId === plantId).sort((a,b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
        const tasks = (await promisifyRequest(tx.objectStore('tasks').getAll()) as Task[]).filter(t => t.plantId === plantId);
        const history = (await promisifyRequest(tx.objectStore('aiHistory').getAll()) as AIHistory[]).filter(h => h.plantId === plantId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { plant, careProfile: careProfile || null, photos, tasks, history };
    },

    addPlant: async (data: { identification: PlantIdentificationResult; nickname: string; initialPhotoUrl: string | null; categoryId?: string; }): Promise<Plant> => {
        const db = await dbPromise;
        const tx = db.transaction(STORES, 'readwrite');
        const plantId = uuidv4();
        const now = new Date().toISOString();

        const newPlant: Plant = {
            id: plantId,
            species: data.identification.species,
            commonName: data.identification.commonName,
            confidence: data.identification.confidence,
            nickname: data.nickname,
            categoryId: data.categoryId,
            createdAt: now,
            photoUrl: data.initialPhotoUrl || undefined,
        };
        tx.objectStore('plants').add(newPlant);
        
        const newCareProfile: CareProfile = { id: plantId, plantId, species: data.identification.species, ...data.identification.careProfile };
        tx.objectStore('careProfiles').add(newCareProfile);

        if (data.initialPhotoUrl) {
            const newPhoto: Photo = { id: uuidv4(), plantId, url: data.initialPhotoUrl, takenAt: now };
            tx.objectStore('photos').add(newPhoto);
        }
        
        const wateringTask = createTaskFromProfile(plantId, 'water', 'Water Plant', data.identification.careProfile.watering);
        if(wateringTask) tx.objectStore('tasks').add(wateringTask);

        const fertilizerTask = createTaskFromProfile(plantId, 'fertilize', 'Fertilize Plant', data.identification.careProfile.fertilizer);
        if(fertilizerTask) tx.objectStore('tasks').add(fertilizerTask);
        
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(newPlant);
            tx.onerror = () => reject(tx.error);
        });
    },

    addCategory: async (name: string): Promise<Category> => {
        const newCategory: Category = { id: uuidv4(), name, createdAt: new Date().toISOString() };
        const db = await dbPromise;
        await promisifyRequest(db.transaction('categories', 'readwrite').objectStore('categories').add(newCategory));
        return newCategory;
    },

    deleteCategory: async (id: string): Promise<void> => {
        const db = await dbPromise;
        const tx = db.transaction(['categories', 'plants'], 'readwrite');
        tx.objectStore('categories').delete(id);

        const plantStore = tx.objectStore('plants');
        plantStore.openCursor().onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                if (cursor.value.categoryId === id) {
                    const updatedPlant = { ...cursor.value, categoryId: undefined };
                    cursor.update(updatedPlant);
                }
                cursor.continue();
            }
        };
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    addPhoto: async (plantId: string, url: string): Promise<Photo> => {
        const newPhoto: Photo = { id: uuidv4(), plantId, url, takenAt: new Date().toISOString() };
        const db = await dbPromise;
        await promisifyRequest(db.transaction('photos', 'readwrite').objectStore('photos').add(newPhoto));
        return newPhoto;
    },
    
    addAIHistory: async (item: Omit<AIHistory, 'id'>): Promise<AIHistory> => {
        const newItem: AIHistory = { ...item, id: uuidv4() };
        const db = await dbPromise;
        await promisifyRequest(db.transaction('aiHistory', 'readwrite').objectStore('aiHistory').add(newItem));
        return newItem;
    },
    
    markTaskComplete: async (taskId: string): Promise<{ updatedTask: Task; newTask: Task | null; }> => {
        const db = await dbPromise;
        const tx = db.transaction(['tasks'], 'readwrite');
        const store = tx.objectStore('tasks');
        const task = await promisifyRequest(store.get(taskId)) as Task;
        if (!task) throw new Error("Task not found");

        const updatedTask = { ...task, completedAt: new Date().toISOString() };
        store.put(updatedTask);

        let newTask: Task | null = null;
        const frequency = parseFrequency(task.notes || "");
        if (frequency > 0) {
            const nextRunAt = new Date();
            nextRunAt.setDate(nextRunAt.getDate() + frequency);
            newTask = { ...task, id: uuidv4(), nextRunAt: nextRunAt.toISOString(), completedAt: undefined };
            store.add(newTask);
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve({ updatedTask, newTask });
            tx.onerror = () => reject(tx.error);
        });
    },

    deletePlant: async (plantId: string): Promise<void> => {
        const db = await dbPromise;
        const tx = db.transaction(STORES, 'readwrite');
        tx.objectStore('plants').delete(plantId);
        tx.objectStore('careProfiles').delete(plantId);
        
        const deleteFromStore = (store: IDBObjectStore) => {
            store.openCursor().onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    if (cursor.value.plantId === plantId) cursor.delete();
                    cursor.continue();
                }
            };
        };
        deleteFromStore(tx.objectStore('photos'));
        deleteFromStore(tx.objectStore('tasks'));
        deleteFromStore(tx.objectStore('aiHistory'));
        
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    clearAllData: async (): Promise<void> => {
        const db = await dbPromise;
        const tx = db.transaction(STORES, 'readwrite');
        STORES.forEach(storeName => tx.objectStore(storeName).clear());
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },
};

interface PlantDetailsData {
  plant: Plant;
  careProfile: CareProfile | null;
  photos: Photo[];
  tasks: Task[];
  history: AIHistory[];
}