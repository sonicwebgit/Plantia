import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations are embedded directly into the application.
// This guarantees they are available instantly on startup, permanently fixing
// the race condition that caused keys like "dashboard.title" to appear.
const enTranslations = {
  "nav": {
    "home": "Home",
    "tasks": "Tasks",
    "addPlant": "Add New Plant",
    "analytics": "Analytics",
    "settings": "Settings"
  },
  "dashboard": {
    "title": "Your Digital Greenhouse",
    "subtitle": "Welcome back! Here are your beloved plants, ready for some TLC.",
    "noPlants": {
      "title": "No plants yet!",
      "subtitle": "Click the \"+\" button below to start your collection.",
      "button": "Add Your First Plant"
    },
    "addedOn": "Added on {{date}}"
  },
  "addPlant": {
    "title": "Add a New Plant",
    "subtitle": "Upload a photo, and our AI will identify it and create a care plan.",
    "upload": {
      "click": "Click to upload",
      "drag": "or drag and drop",
      "formats": "PNG, JPG, or WEBP"
    },
    "identifying": "Identifying your plant...",
    "identifying_desc": "This can take a moment. Our AI is analyzing the leaves, petals, and stems.",
    "error": "Identification Failed",
    "identifiedAs": "AI Identified as:",
    "confidence": "{{percent}}% confidence",
    "nicknameLabel": "Nickname for your plant:",
    "careSummary": "Initial Care Summary:",
    "sunlight": "Sunlight:",
    "watering": "Watering:",
    "saveButton": "Save Plant to Collection",
    "savingButton": "Saving...",
    "differentPhotoButton": "Use a Different Photo",
    "errors": {
      "fileProcess": "Could not read or process the selected file.",
      "saveFailed": "Failed to save the plant. The device storage might be full."
    }
  },
  "plantDetail": {
    "careProfile": "Care Profile",
    "sunlight": "Sunlight",
    "watering": "Watering",
    "soil": "Soil",
    "fertilizer": "Fertilizer",
    "temp": "Temp.",
    "humidity": "Humidity",
    "progressPhotos": "Progress Photos",
    "uploading": "Uploading...",
    "tasksAndReminders": "Tasks & Reminders",
    "due": "Due: {{date}}",
    "markAsDone": "Mark as Done",
    "noPendingTasks": "No pending tasks. Well done!",
    "askAI": "Ask Plantia AI",
    "conversationHistory": "Conversation History",
    "askAIDesc": "Have a question about your {{plantName}}? Describe the issue, add a photo if helpful, and our AI assistant will provide advice.",
    "yourQuestion": "Your Question",
    "questionPlaceholder": "e.g., Why are the leaves turning yellow and crispy at the edges?",
    "addPhoto": "Add Photo",
    "changePhoto": "Change Photo",
    "removeImage": "Remove image",
    "askButton": "Ask AI",
    "thinking": "Thinking...",
    "aiIsThinking": "Plantia AI is thinking...",
    "aiIsThinkingDesc": "Analyzing your question and photo to find the best advice.",
    "aiError": "AI Assistant Error",
    "tryAgain": "Try Again",
    "yourQuestionWas": "Your Question:",
    "aiAnswer": "Plantia AI's Answer:",
    "askAnother": "Ask Another Question",
    "dangerZone": "Danger Zone",
    "deleteThisPlant": "Delete this plant",
    "deleteThisPlantDesc": "Permanently remove this plant and all its data, including photos and tasks.",
    "deleteButton": "Delete Plant",
    "deletingButton": "Deleting...",
    "deleteConfirm": "Are you sure you want to delete \"{{plantName}}\"? This action is permanent and cannot be undone.",
    "deleteError": "Could not delete the plant. Please try again.",
    "plantNotFound": "Plant Not Found",
    "plantNotFoundDesc": "The plant you are looking for does not exist.",
    "goToDashboard": "Go to Dashboard"
  },
  "settings": {
    "title": "Settings",
    "subtitle": "Manage your application preferences and data.",
    "appearance": "Appearance",
    "theme": "Theme",
    "light": "Light",
    "dark": "Dark",
    "system": "System",
    "language": "Language",
    "notifications": "Notifications",
    "taskReminders": "Background Task Reminders",
    "notifStatus": {
      "enabled_sync": "You will receive reminders for tasks, even when the app is closed.",
      "enabled_no_sync": "Reminders are on. Notifications may only appear when the app is open.",
      "disabled": "Enable to receive daily task reminders.",
      "denied": "Notifications are blocked. Please enable them in your browser's site settings.",
      "unsupported": "Notifications are not available in this environment (e.g., iframe or non-HTTPS)."
    },
    "dangerZone": "Danger Zone",
    "clearAllData": "Clear All Data",
    "clearAllDataDesc": "Permanently delete your entire plant collection, including all photos and tasks.",
    "deleteAllButton": "Delete All Data",
    "clearDataConfirm": "Are you sure you want to delete all your plant data? This action cannot be undone.",
    "clearDataSuccess": "All data has been cleared.",
    "themeError": "Could not save theme preference. Your browser might be blocking storage access.",
    "notifEnableError": "An unexpected error occurred while enabling notifications."
  },
  "tasks": {
    "title": "Tasks",
    "today": "Today's Tasks",
    "week": "Weekly Tasks",
    "toDo": "To Do",
    "completed": "Completed",
    "noTasksToday": "No tasks scheduled for today.",
    "noTasksWeek": "No tasks scheduled for this week.",
    "for": "For: {{plantName}}",
    "doneDate": "Done: {{date}}",
    "dueDate": "Due: {{date}}",
    "type": {
      "water": "Water Plant",
      "fertilize": "Fertilize",
      "prune": "Prune",
      "repot": "Repot",
      "custom": "Custom Task"
    }
  },
  "analytics": {
    "title": "Analytics Dashboard",
    "totalPlants": "Total Plants",
    "uniqueSpecies": "Unique Species",
    "photosTaken": "Photos Taken",
    "tasksThisWeek": "Tasks This Week",
    "plantsByLocation": "Plants by Location",
    "unassigned": "Unassigned",
    "error": "Error loading analytics",
    "noData": "No Data Yet",
    "noDataDesc": "Add a plant to start seeing your collection's analytics.",
    "addPlant": "Add a Plant"
  },
  "errors": {
    "gemini": {
      "emptyResponse": "Received an empty response from the AI service.",
      "invalidResponse": "The AI service returned an invalid response. Please try again.",
      "invalidApiKey": "The Google AI API key is invalid or missing. Please check your configuration.",
      "unknownIdentify": "An unexpected error occurred during plant identification.",
      "unknownAsk": "An unexpected error occurred while asking the AI."
    }
  },
  "sw": {
    "notification": {
      "title": "Plantia Task Reminder",
      "body_one": "You have {{count}} plant task to complete today!",
      "body_other": "You have {{count}} plant tasks to complete today!"
    }
  }
};

i18n
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  .init({
    // Hardcode the language to 'en'. This, combined with the embedded
    // resources, makes the entire initialization process synchronous.
    lng: 'en',
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources: {
      en: {
        translation: enTranslations,
      },
    },
    // Suspense is no longer needed because there is no asynchronous loading.
    react: {
      useSuspense: false,
    },
  });

export default i18n;