import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { getFirestoreDB, getAuth } from './firebase';
import {
    collection, query, where, getDocs, getDoc, doc, addDoc, deleteDoc, writeBatch, serverTimestamp,
    Timestamp, orderBy, updateDoc, deleteField, DocumentSnapshot
} from 'firebase/firestore';
import type { Plant, CareProfile, Photo, Task, AIHistory, Category, PlantIdentificationResult, StoredData } from '../types';


// --- Gemini AI Service (No Changes) ---

let ai: GoogleGenAI | null = null;

function getAiInstance(): GoogleGenAI {
    if (ai) {
        return ai;
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Gemini API key is missing. Please ensure the API_KEY environment variable is configured for your deployment.");
    }
    ai = new GoogleGenAI({ apiKey });
    return ai;
}

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
      const response: GenerateContentResponse = await getAiInstance().models.generateContent({
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
      throw new Error(error instanceof Error ? error.message : "An unexpected error occurred during plant identification.");
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
        const response = await getAiInstance().models.generateContent({
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
        throw new Error(error instanceof Error ? error.message : "An unexpected error occurred while asking the AI.");
    }
  }
};

// --- Utilities ---

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

function createTaskFromProfile(plantId: string, type: 'water' | 'fertilize', title: string, instruction: string): Omit<Task, 'id'> | null {
    const days = parseFrequency(instruction);
    if (days > 0) {
        const nextRunAt = new Date();
        nextRunAt.setDate(nextRunAt.getDate() + days);
        return {
            plantId,
            type,
            title,
            notes: `Based on care profile: "${instruction}"`,
            nextRunAt: nextRunAt.toISOString()
        };
    }
    return null;
}

// --- Firestore Service ---

const STORES: (keyof StoredData)[] = ['plants', 'careProfiles', 'photos', 'tasks', 'aiHistory', 'categories'];

const getCurrentUserId = (): string => {
    const user = getAuth().currentUser;
    if (!user) {
        throw new Error("User not authenticated. Cannot perform database operation.");
    }
    return user.uid;
};

function dataFromSnapshot<T>(doc: DocumentSnapshot): T {
    const data = doc.data() as any;
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { ...data, id: doc.id } as T;
}

const firestoreService = {
    getPlants: async (): Promise<Plant[]> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();
        const q = query(collection(db, `users/${uid}/plants`), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => dataFromSnapshot<Plant>(doc));
    },
    getCategories: async (): Promise<Category[]> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();
        const q = query(collection(db, `users/${uid}/categories`), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => dataFromSnapshot<Category>(doc));
    },
    getPhotos: async (): Promise<Photo[]> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();
        const q = query(collection(db, `users/${uid}/photos`));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => dataFromSnapshot<Photo>(doc));
    },
    getTasks: async (): Promise<Task[]> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();
        const q = query(collection(db, `users/${uid}/tasks`));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => dataFromSnapshot<Task>(doc));
    },

    getPlantDetails: async (plantId: string): Promise<PlantDetailsData | null> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();

        const plantRef = doc(db, `users/${uid}/plants/${plantId}`);
        const plantSnap = await getDoc(plantRef);
        if (!plantSnap.exists()) return null;

        const plant = dataFromSnapshot<Plant>(plantSnap);

        const careProfileRef = doc(db, `users/${uid}/careProfiles/${plantId}`);
        const careProfileSnap = await getDoc(careProfileRef);
        const careProfile = careProfileSnap.exists() ? dataFromSnapshot<CareProfile>(careProfileSnap) : null;

        const baseQuery = (collectionName: string) => query(collection(db, `users/${uid}/${collectionName}`), where('plantId', '==', plantId));

        const photosSnap = await getDocs(query(baseQuery('photos'), orderBy('takenAt', 'desc')));
        const tasksSnap = await getDocs(baseQuery('tasks'));
        const historySnap = await getDocs(query(baseQuery('aiHistory'), orderBy('createdAt', 'desc')));

        return {
            plant,
            careProfile,
            photos: photosSnap.docs.map(d => dataFromSnapshot<Photo>(d)),
            tasks: tasksSnap.docs.map(d => dataFromSnapshot<Task>(d)),
            history: historySnap.docs.map(d => dataFromSnapshot<AIHistory>(d)),
        };
    },

    addPlant: async (data: { identification: PlantIdentificationResult; nickname: string; initialPhotoUrl: string | null; categoryId?: string; }): Promise<Plant> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();
        const batch = writeBatch(db);

        const plantRef = doc(collection(db, `users/${uid}/plants`));
        const plantId = plantRef.id;

        const newPlant: Omit<Plant, 'id'> = {
            species: data.identification.species,
            commonName: data.identification.commonName,
            confidence: data.identification.confidence,
            nickname: data.nickname,
            categoryId: data.categoryId,
            createdAt: serverTimestamp() as any, // Firestore will convert this
            photoUrl: data.initialPhotoUrl || undefined,
        };
        batch.set(plantRef, newPlant);
        
        const newCareProfile: Omit<CareProfile, 'id'> = { plantId, species: data.identification.species, ...data.identification.careProfile };
        batch.set(doc(db, `users/${uid}/careProfiles/${plantId}`), newCareProfile);

        if (data.initialPhotoUrl) {
            const newPhoto: Omit<Photo, 'id'> = { plantId, url: data.initialPhotoUrl, takenAt: serverTimestamp() as any };
            batch.set(doc(collection(db, `users/${uid}/photos`)), newPhoto);
        }
        
        const wateringTask = createTaskFromProfile(plantId, 'water', 'Water Plant', data.identification.careProfile.watering);
        if(wateringTask) batch.set(doc(collection(db, `users/${uid}/tasks`)), wateringTask);

        const fertilizerTask = createTaskFromProfile(plantId, 'fertilize', 'Fertilize Plant', data.identification.careProfile.fertilizer);
        if(fertilizerTask) batch.set(doc(collection(db, `users/${uid}/tasks`)), fertilizerTask);
        
        await batch.commit();

        return { ...newPlant, id: plantId, createdAt: new Date().toISOString() };
    },

    addCategory: async (name: string): Promise<Category> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();
        const newCategory: Omit<Category, 'id'> = { name, createdAt: serverTimestamp() as any };
        const docRef = await addDoc(collection(db, `users/${uid}/categories`), newCategory);
        return { ...newCategory, id: docRef.id, createdAt: new Date().toISOString() };
    },

    deleteCategory: async (id: string): Promise<void> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();
        const batch = writeBatch(db);
        
        batch.delete(doc(db, `users/${uid}/categories/${id}`));

        const q = query(collection(db, `users/${uid}/plants`), where('categoryId', '==', id));
        const plantsToUpdate = await getDocs(q);
        plantsToUpdate.forEach(plantDoc => {
            batch.update(plantDoc.ref, { categoryId: deleteField() });
        });
        
        await batch.commit();
    },

    addPhoto: async (plantId: string, url: string): Promise<Photo> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();
        const newPhoto: Omit<Photo, 'id'> = { plantId, url, takenAt: serverTimestamp() as any };
        const docRef = await addDoc(collection(db, `users/${uid}/photos`), newPhoto);
        return { ...newPhoto, id: docRef.id, takenAt: new Date().toISOString() };
    },
    
    addAIHistory: async (item: Omit<AIHistory, 'id'>): Promise<AIHistory> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();
        const newItem: Omit<AIHistory, 'id'> = { ...item, createdAt: serverTimestamp() as any };
        const docRef = await addDoc(collection(db, `users/${uid}/aiHistory`), newItem);
        return { ...item, id: docRef.id, createdAt: new Date().toISOString() };
    },
    
    markTaskComplete: async (taskId: string): Promise<{ updatedTask: Task; newTask: Task | null; }> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();
        const batch = writeBatch(db);
        
        const taskRef = doc(db, `users/${uid}/tasks/${taskId}`);
        const taskSnap = await getDoc(taskRef);
        if (!taskSnap.exists()) throw new Error("Task not found");

        const task = dataFromSnapshot<Task>(taskSnap);
        const updatedTask = { ...task, completedAt: new Date().toISOString() };
        batch.update(taskRef, { completedAt: updatedTask.completedAt });

        let newTask: Task | null = null;
        const frequency = parseFrequency(task.notes || "");
        if (frequency > 0) {
            const nextRunAt = new Date();
            nextRunAt.setDate(nextRunAt.getDate() + frequency);
            const newTaskData = { ...task, nextRunAt: nextRunAt.toISOString(), completedAt: undefined };
            delete (newTaskData as Partial<Task>).id;
            
            const newTaskRef = doc(collection(db, `users/${uid}/tasks`));
            batch.set(newTaskRef, newTaskData);
            newTask = { ...newTaskData, id: newTaskRef.id };
        }
        
        await batch.commit();
        return { updatedTask, newTask };
    },

    deletePlant: async (plantId: string): Promise<void> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();
        const batch = writeBatch(db);

        // Delete main plant and care profile docs
        batch.delete(doc(db, `users/${uid}/plants/${plantId}`));
        batch.delete(doc(db, `users/${uid}/careProfiles/${plantId}`));

        // Query and delete all related sub-collection documents
        const collectionsToDelete = ['photos', 'tasks', 'aiHistory'];
        for (const coll of collectionsToDelete) {
            const q = query(collection(db, `users/${uid}/${coll}`), where('plantId', '==', plantId));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => batch.delete(doc.ref));
        }

        await batch.commit();
    },

    clearAllData: async (): Promise<void> => {
        const uid = getCurrentUserId();
        const db = getFirestoreDB();

        // This is a simplified version. For large collections, this should be done
        // in a Cloud Function to avoid client-side timeouts.
        for (const storeName of STORES) {
            const batch = writeBatch(db);
            const q = query(collection(db, `users/${uid}/${storeName}`));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
    },
};

// --- IndexedDB Service (For Preview/Offline Fallback) ---

const DB_NAME = 'PlantiaDB';
const DB_VERSION = 1;

const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    // Check if indexedDB is available before trying to open it.
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported, preview mode data will not be persisted.');
      // We don't reject here, we just won't be able to use the DB.
      // Operations will fail gracefully later.
      return;
    }
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

const indexedDbService = {
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
        
        const wateringTaskData = createTaskFromProfile(plantId, 'water', 'Water Plant', data.identification.careProfile.watering);
        if(wateringTaskData) tx.objectStore('tasks').add({...wateringTaskData, id: uuidv4()});

        const fertilizerTaskData = createTaskFromProfile(plantId, 'fertilize', 'Fertilize Plant', data.identification.careProfile.fertilizer);
        if(fertilizerTaskData) tx.objectStore('tasks').add({...fertilizerTaskData, id: uuidv4()});
        
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
        const newItem: AIHistory = { ...item, id: uuidv4(), createdAt: new Date().toISOString() };
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

const isInPreview = window.top !== window;

export const db = isInPreview ? indexedDbService : firestoreService;