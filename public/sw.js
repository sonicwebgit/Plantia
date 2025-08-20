/// <reference lib="webworker" />

// @ts-check

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const DB_NAME = 'PlantiaDB';
const DB_VERSION = 1;

let translations = {};

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
 * Simple translation function with pluralization support.
 * @param {string} key - The translation key (e.g., 'sw.notification.body')
 * @param {{[x: string]: string | number}} [options] - Options like 'count'.
 * @returns {string} - The translated string.
 */
const t = (key, options) => {
    const { count } = options || {};
    let chosenKey = key;

    // Handle pluralization based on count
    if (typeof count !== 'undefined') {
        if (count === 1) {
            chosenKey += '_one';
        } else {
            chosenKey += '_other';
        }
    }
    
    // Navigate nested keys
    let template = chosenKey.split('.').reduce((obj, k) => (obj && obj[k] !== 'undefined') ? obj[k] : undefined, translations);
    
    // Fallback to the original key if not found
    if (!template) {
        template = key.split('.').reduce((obj, k) => (obj && obj[k] !== 'undefined') ? obj[k] : undefined, translations) || key;
    }

    // Replace placeholders like {{count}}
    if (typeof template === 'string' && options) {
        return template.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
            const trimmedKey = p1.trim();
            return options[trimmedKey] !== undefined ? String(options[trimmedKey]) : match;
        });
    }

    return template || key;
}


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
 * Fetches user settings (like language) from the database.
 * @param {string} key
 * @returns {Promise<any>}
 */
const getSetting = async (key) => {
    const db = await getDb();
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const result = await promisifyRequest(store.get(key));
    return result ? result.value : undefined;
};


/**
 * Loads translations based on the user's preferred language.
 */
const loadTranslations = async () => {
    try {
        const lang = await getSetting('language') || 'en';
        const response = await fetch(`/locales/${lang}/translation.json`);
        if (response.ok) {
            translations = await response.json();
        } else {
            // Fallback to English if the language file is not found
            const fallbackResponse = await fetch(`/locales/en/translation.json`);
            if (fallbackResponse.ok) {
                translations = await fallbackResponse.json();
            }
        }
    } catch (error) {
        console.error("SW: Failed to load translation files", error);
    }
};


/**
 * Checks for incomplete tasks due today and shows a notification.
 */
const checkTasksAndNotify = async () => {
    console.log("Service Worker: Running daily task check...");
    try {
        await loadTranslations(); // Load the latest translations
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
            console.log(`Service Worker: Found ${incompleteToday.length} incomplete task(s).`);
            const count = incompleteToday.length;
            await sw.registration.showNotification(t('sw.notification.title'), {
                body: t('sw.notification.body', { count }),
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