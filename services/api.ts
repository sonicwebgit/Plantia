
import { GoogleGenAI, Type } from "@google/genai";
import type { Plant, CareProfile, Photo, Task, PlantIdentificationResult, StoredData } from '../types';

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
      const apiKey = import.meta.env.VITE_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        throw new Error("Google API Key is not configured. Please ensure the VITE_API_KEY environment variable is set correctly.");
      }
      const ai = new GoogleGenAI({ apiKey });
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

      const jsonString = response.text.trim();
      const result = JSON.parse(jsonString);
      
      return result as PlantIdentificationResult;
    } catch (error) {
      console.error("Error identifying plant:", error);
      // Pass the original error message through to the UI layer.
      if (error instanceof Error) {
        throw error;
      }
      // Fallback for non-Error objects being thrown
      throw new Error("An unexpected error occurred during plant identification.");
    }
  },
};


// --- Mock Database Service (using localStorage) ---

const DB_KEY = 'plantia_data';

const getDb = (): StoredData => {
  const initialData: StoredData = { plants: [], careProfiles: [], photos: [], tasks: [] };

  try {
    const data = localStorage.getItem(DB_KEY);
    if (!data) {
      // No data exists, initialize it
      localStorage.setItem(DB_KEY, JSON.stringify(initialData));
      return initialData;
    }
    
    // Data exists, try to parse it
    try {
      const parsedData = JSON.parse(data);
      
      // Ensure parsedData is a valid object before accessing its properties.
      if (typeof parsedData !== 'object' || parsedData === null) {
          throw new Error("Stored data is not a valid object.");
      }

      // Deep validation helper: ensures a property is an array and filters out any non-object/null entries within it.
      // This prevents crashes from corrupted array contents (e.g., [plant1, null, plant3]).
      const validateAndFilter = (arr: unknown): any[] => {
          if (!Array.isArray(arr)) return [];
          return arr.filter(item => item && typeof item === 'object');
      };

      return {
        plants: validateAndFilter(parsedData.plants),
        careProfiles: validateAndFilter(parsedData.careProfiles),
        photos: validateAndFilter(parsedData.photos),
        tasks: validateAndFilter(parsedData.tasks),
      };
    } catch (error) {
      console.error("Failed to parse localStorage data, resetting.", error);
      // If data is corrupt, reset it
      localStorage.setItem(DB_KEY, JSON.stringify(initialData));
      return initialData;
    }
  } catch (error) {
    // This top-level catch handles cases where localStorage is completely inaccessible
    // (e.g., sandboxed iframes, security settings, private browsing mode).
    console.error("Could not access localStorage. App will use temporary data for this session.", error);
    return initialData;
  }
};


const saveDb = (data: StoredData) => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.error("LocalStorage quota exceeded:", error);
      throw new Error("Storage is full. Could not save the plant data. Please try using a smaller image or clearing other site data.");
    }
    console.error("Failed to save to localStorage:", error);
    throw new Error("An unexpected error occurred while saving data.");
  }
};

export const db = {
  getPlants: async (): Promise<Plant[]> => {
    return getDb().plants.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getTasks: async (): Promise<Task[]> => {
    return getDb().tasks;
  },

  getPhotos: async (): Promise<Photo[]> => {
    return getDb().photos;
  },

  getPlantDetails: async (plantId: string) => {
    const data = getDb();
    const plant = data.plants.find(p => p.id === plantId);
    if (!plant) return null;

    return {
      plant,
      careProfile: data.careProfiles.find(cp => cp.plantId === plantId) || null,
      photos: data.photos.filter(p => p.plantId === plantId).sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()),
      tasks: data.tasks.filter(t => t.plantId === plantId).sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime()),
    };
  },

  addPlant: async (data: {
    identification: PlantIdentificationResult;
    nickname?: string;
    location?: string;
    initialPhotoUrl?: string | null;
  }): Promise<Plant> => {
    const fullDb = getDb();
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
    
    fullDb.plants.push(newPlant);
    fullDb.careProfiles.push(newCareProfile);

    // Add initial photo if provided
    if (data.initialPhotoUrl) {
        const newPhoto: Photo = {
            id: `photo_${Date.now()}`,
            plantId,
            url: data.initialPhotoUrl,
            notes: "Initial photo",
            takenAt: now,
        };
        fullDb.photos.push(newPhoto);
    }
    
    // Add default tasks
    const defaultTasks: Omit<Task, 'id' | 'plantId'>[] = [
        { type: 'water', title: 'Water Plant', nextRunAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
        { type: 'fertilize', title: 'Fertilize', nextRunAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    defaultTasks.forEach(task => {
        fullDb.tasks.push({
            id: `task_${Date.now()}_${Math.random()}`,
            plantId: plantId,
            ...task
        });
    });

    saveDb(fullDb); // Atomic save of all initial data
    return newPlant;
  },
  
  deletePlant: async (plantId: string): Promise<void> => {
    const fullDb = getDb();
    const updatedDb: StoredData = {
      plants: fullDb.plants.filter(p => p.id !== plantId),
      careProfiles: fullDb.careProfiles.filter(cp => cp.plantId !== plantId),
      photos: fullDb.photos.filter(p => p.plantId !== plantId),
      tasks: fullDb.tasks.filter(t => t.plantId !== plantId),
    };
    saveDb(updatedDb);
  },

  addPhoto: async (plantId: string, url: string, notes?: string): Promise<Photo> => {
    const fullDb = getDb();
    const newPhoto: Photo = {
      id: `photo_${Date.now()}`,
      plantId,
      url,
      notes,
      takenAt: new Date().toISOString(),
    };
    fullDb.photos.push(newPhoto);
    saveDb(fullDb);
    return newPhoto;
  },
  
  addTask: async (plantId: string, taskData: Omit<Task, 'id' | 'plantId' | 'completedAt'>): Promise<Task> => {
    const fullDb = getDb();
    const newTask: Task = {
        id: `task_${Date.now()}`,
        plantId,
        ...taskData
    };
    fullDb.tasks.push(newTask);
    saveDb(fullDb);
    return newTask;
  },
  
  updateTask: async (taskId: string, updates: Partial<Pick<Task, 'completedAt'>>): Promise<Task | null> => {
    const fullDb = getDb();
    const taskIndex = fullDb.tasks.findIndex(t => t.id === taskId);
    if(taskIndex === -1) return null;

    const updatedTask = { ...fullDb.tasks[taskIndex], ...updates };
    fullDb.tasks[taskIndex] = updatedTask;
    saveDb(fullDb);
    return updatedTask;
  },

  clearAllData: () => {
    localStorage.removeItem(DB_KEY);
  }
};
