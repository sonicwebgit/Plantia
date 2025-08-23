// Adaptive API service that works with both local IndexedDB and server API
import { db as localDb } from './api';
import type { Plant, Category, Task, Photo, CareProfile, PlantIdentificationResult } from '../types';

class AdaptiveApiService {
  private isOnline = navigator.onLine;
  private hasAuth = false;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  setAuthStatus(hasAuth: boolean) {
    this.hasAuth = hasAuth;
  }

  private get useServerApi() {
    return this.isOnline && this.hasAuth;
  }

  // Plants API
  async getPlants(): Promise<Plant[]> {
    if (this.useServerApi) {
      try {
        const response = await fetch('/api/plants', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.success ? data.plants : [];
        }
      } catch (error) {
        console.error('Server API failed, falling back to local:', error);
      }
    }
    
    return localDb.getPlants();
  }

  async addPlant(data: {
    identification: PlantIdentificationResult;
    nickname?: string;
    location?: string;
    categoryId?: string;
    initialPhotoUrl?: string | null;
  }): Promise<Plant> {
    if (this.useServerApi) {
      try {
        const response = await fetch('/api/plants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            identification: data.identification,
            nickname: data.nickname,
            location: data.location,
            categoryId: data.categoryId,
            notes: ''
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            return result.plant;
          }
        }
      } catch (error) {
        console.error('Server API failed, falling back to local:', error);
      }
    }
    
    return localDb.addPlant(data);
  }

  async deletePlant(plantId: string): Promise<void> {
    if (this.useServerApi) {
      try {
        const response = await fetch(`/api/plants?id=${plantId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        if (response.ok) {
          return;
        }
      } catch (error) {
        console.error('Server API failed, falling back to local:', error);
      }
    }
    
    return localDb.deletePlant(plantId);
  }

  // Categories API
  async getCategories(): Promise<Category[]> {
    if (this.useServerApi) {
      try {
        const response = await fetch('/api/categories', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.success ? data.categories : [];
        }
      } catch (error) {
        console.error('Server API failed, falling back to local:', error);
      }
    }
    
    return localDb.getCategories();
  }

  async addCategory(name: string): Promise<Category> {
    if (this.useServerApi) {
      try {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ name }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            return result.category;
          }
        }
      } catch (error) {
        console.error('Server API failed, falling back to local:', error);
      }
    }
    
    return localDb.addCategory(name);
  }

  async deleteCategory(categoryId: string): Promise<void> {
    if (this.useServerApi) {
      try {
        const response = await fetch(`/api/categories?id=${categoryId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        if (response.ok) {
          return;
        }
      } catch (error) {
        console.error('Server API failed, falling back to local:', error);
      }
    }
    
    return localDb.deleteCategory(categoryId);
  }

  // For methods that don't have server equivalents yet, use local DB
  async getTasks(): Promise<Task[]> {
    return localDb.getTasks();
  }

  async getPhotos(): Promise<Photo[]> {
    return localDb.getPhotos();
  }

  async getPlantDetails(plantId: string) {
    return localDb.getPlantDetails(plantId);
  }

  async addPhoto(plantId: string, url: string, notes?: string): Promise<Photo> {
    return localDb.addPhoto(plantId, url, notes);
  }

  async addTask(plantId: string, taskData: Omit<Task, 'id' | 'plantId' | 'completedAt'>): Promise<Task> {
    return localDb.addTask(plantId, taskData);
  }

  async markTaskComplete(taskId: string): Promise<{ updatedTask: Task; newTask?: Task }> {
    return localDb.markTaskComplete(taskId);
  }

  async updatePlant(plantId: string, updates: Partial<Plant>): Promise<Plant | null> {
    return localDb.updatePlant(plantId, updates);
  }

  async deleteTask(taskId: string): Promise<void> {
    return localDb.deleteTask(taskId);
  }

  async getAIHistory(plantId: string) {
    return localDb.getAIHistory(plantId);
  }

  async addAIHistory(plantId: string, question: string, answer: string, photoUrl?: string) {
    return localDb.addAIHistory(plantId, question, answer, photoUrl);
  }

  async deleteAIHistory(historyId: string): Promise<void> {
    return localDb.deleteAIHistory(historyId);
  }

  async clearAllData(): Promise<void> {
    return localDb.clearAllData();
  }

  async getSetting<T>(key: string): Promise<T | undefined> {
    return localDb.getSetting(key);
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    return localDb.setSetting(key, value);
  }
}

export const adaptiveDb = new AdaptiveApiService();