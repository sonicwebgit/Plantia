// This file provides custom type definitions for the Periodic Background Sync API,
// which is not yet included in the default TypeScript DOM library.
// By defining these interfaces at the top level without any imports or exports,
// this file acts as a global script, augmenting the necessary browser types.

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  readonly periodicSync: PeriodicSyncManager;
}

interface PeriodicSyncEvent extends ExtendableEvent {
  readonly tag: string;
}

// Augment the existing event map for the Service Worker global scope.
// This allows `addEventListener('periodicsync', ...)` to be correctly typed.
interface ServiceWorkerGlobalScopeEventMap {
  periodicsync: PeriodicSyncEvent;
}
