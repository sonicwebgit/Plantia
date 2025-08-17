import { GoogleGenAI, Type } from "@google/genai";
import type { Plant, CareProfile, Photo, Task, PlantIdentificationResult, StoredData } from '../types';

// --- Gemini API Service ---

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.warn("API_KEY environment variable not set. Gemini API calls will be disabled.");
}

const model = 'gemini-2.5-flash';

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
    if (!ai) {
        throw new Error("Gemini AI client is not initialized. Please check your API_KEY.");
    }
    try {
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
      throw new Error("Failed to identify plant. The model may be unavailable or the image may be unclear.");
    }
  },
};


// --- Mock Database Service (using localStorage) ---

const DB_KEY = 'plantia_data';

const getDb = (): StoredData => {
  const data = localStorage.getItem(DB_KEY);
  if (data) {
    return JSON.parse(data);
  }
  // Initialize with empty data if nothing is stored
  const initialData: StoredData = { plants: [], careProfiles: [], photos: [], tasks: [] };
  localStorage.setItem(DB_KEY, JSON.stringify(initialData));
  return initialData;
};

const saveDb = (data: StoredData) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
};

export const db = {
  getPlants: async (): Promise<Plant[]> => {
    return getDb().plants.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getTasks: async (): Promise<Task[]> => {
    return getDb().tasks;
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

    saveDb(fullDb);
    return newPlant;
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