/**
 * This file augments existing web APIs with types for experimental features.
 * By not having any top-level imports or exports, this file is treated as
 * a global script by TypeScript, and its declarations are merged into the
 * global scope, providing type safety for non-standard APIs.
 */

// --- Periodic Background Sync API ---

/**
 * Represents the manager for registering and unregistering periodic sync requests.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PeriodicSyncManager
 */
interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

/**
 * The event object for the `periodicsync` event.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PeriodicSyncEvent
 */
interface PeriodicSyncEvent extends ExtendableEvent {
  readonly tag: string;
}


// --- Global Interface Augmentations ---

/**
 * Augments the `ServiceWorkerRegistration` interface to include the `periodicSync` property.
 */
interface ServiceWorkerRegistration {
  readonly periodicSync: PeriodicSyncManager;
}

/**
 * Augments the map of events that a Service Worker can listen to.
 * This allows `self.addEventListener('periodicsync', ...)` to be correctly typed.
 */
interface ServiceWorkerGlobalScopeEventMap {
  periodicsync: PeriodicSyncEvent;
}

/**
 * Augments the `Permissions` interface to add a specific overload for the `query` method.
 * This teaches TypeScript that 'periodic-background-sync' is a valid, queryable permission,
 * resolving type errors without overwriting the original method signatures.
 */
interface Permissions {
  query(
    permissionDesc: { name: 'periodic-background-sync' }
  ): Promise<PermissionStatus>;
}
