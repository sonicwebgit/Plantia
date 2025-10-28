
export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Plant {
  id: string;
  species: string;
  commonName?: string;
  confidence?: number;
  nickname?: string;
  location?: string;
  categoryId?: string;
  notes?: string;
  createdAt: string;
  photoUrl?: string; // The primary photo URL from Firebase Storage
}

export interface CareProfile {
  id: string;
  plantId: string;
  species: string;
  sunlight: string;
  watering: string;
  soil: string;
  fertilizer: string;
  tempRange: string;
  humidity: string;
  tips?: string;
}

export interface Photo {
  id: string;
  plantId: string;
  url: string; // URL from Firebase Storage
  takenAt: string;
  notes?: string;
}

export interface Task {
  id:string;
  plantId: string;
  type: 'water' | 'fertilize' | 'prune' | 'repot' | 'custom';
  title: string;
  notes?: string;
  nextRunAt: string;
  completedAt?: string;
}

export interface AIHistory {
  id: string;
  plantId: string;
  question: string;
  answer: string;
  photoUrl?: string;
  createdAt: string;
}

export interface PlantIdentificationResult {
  species: string;
  commonName: string;
  confidence: number;
  careProfile: Omit<CareProfile, 'id' | 'plantId' | 'species'>;
}

export interface StoredData {
  plants: Plant[];
  careProfiles: CareProfile[];
  photos: Photo[];
  tasks: Task[];
  aiHistory: AIHistory[];
  categories: Category[];
}