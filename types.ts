

// Authentication Types
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
}

export interface UserKey {
  id: string;
  userId: string;
  hashedPassword?: string;
  providerId: string;
  providerUserId: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  googleLogin: () => Promise<void>;
}

// App Data Types
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
  url: string;
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