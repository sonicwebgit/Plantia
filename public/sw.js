/// <reference lib="webworker" />

// @ts-check

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const DB_NAME = 'PlantiaDB';
const DB_VERSION = 1;

/**
 * A promise-based wrapper for IndexedDB requests.
 * @template T
 * @param {IDBRequest<T>} request The IDBRequest to promisify.
 * @returns {Promise<T>} A promise that resolves with the request result.
 */
const promisifyRequest = (request) => {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Opens and returns the IndexedDB database instance.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
const getDb = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = (event) => {
            resolve((/** @type {IDBOpenDBRequest} */ (event.target)).result);
        };
        request.onerror = (event) => {
            const target = /** @type {IDBOpenDBRequest} */ (event.target);
            console.error("IndexedDB error in SW:", target.error);
            reject("IndexedDB error: " + target.error);
        };
        // onupgradeneeded is not handled here, assuming the main app created the DB.
    });
};


/**
 * Fetches all tasks from the database.
 * @returns {Promise<any[]>} A promise that resolves with an array of tasks.
 */
const getTasks = async () => {
    const db = await getDb();
    const tx = db.transaction('tasks', 'readonly');
    const store = tx.objectStore('tasks');
    return promisifyRequest(store.getAll());
};

/**
 * Checks for incomplete tasks due today and shows a notification.
 */
const checkTasksAndNotify = async () => {
    console.log("Service Worker: Running daily task check...");
    try {
        const allTasks = await getTasks();
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const incompleteToday = allTasks.filter(task => {
            if (task.completedAt) return false;
            const dueDate = new Date(task.nextRunAt);
            return dueDate >= todayStart && dueDate <= todayEnd;
        });

        if (incompleteToday.length > 0) {
            const count = incompleteToday.length;
            const plural = count === 1 ? '' : 's';
            console.log(`Service Worker: Found ${count} incomplete task(s).`);
            await sw.registration.showNotification("Plantia Task Reminder", {
                body: `You have ${count} plant task${plural} to complete today!`,
                icon: '/favicon.svg',
                badge: '/favicon.svg',
            });
        } else {
            console.log("Service Worker: No incomplete tasks for today.");
        }
    } catch (error) {
        console.error("Service Worker: Error checking tasks.", error);
    }
};

// Listen for the periodic sync event.
// The tag 'daily-task-check' is registered from the main app's settings page.
sw.addEventListener('periodicsync', (event) => {
    if (event.tag === 'daily-task-check') {
        event.waitUntil(checkTasksAndNotify());
    }
});

// Optional: Add a listener to activate the new service worker immediately.
sw.addEventListener('install', (/** @type {ExtendableEvent} */ event) => {
  event.waitUntil(sw.skipWaiting());
});

sw.addEventListener('activate', (/** @type {ExtendableEvent} */ event) => {
  event.waitUntil(sw.clients.claim());
});