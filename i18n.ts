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

const mkTranslations = {
  "nav": {
    "home": "Почетна",
    "tasks": "Задачи",
    "addPlant": "Додај растение",
    "analytics": "Аналитика",
    "settings": "Поставки"
  },
  "dashboard": {
    "title": "Твојата дигитална стаклена градина",
    "subtitle": "Добредојде назад! Еве ги твоите сакани растенија, спремни за нега.",
    "noPlants": {
      "title": "Сè уште нема растенија!",
      "subtitle": "Кликни на копчето „+“ долу за да ја започнеш твојата колекција.",
      "button": "Додај го твоето прво растение"
    },
    "addedOn": "Додадено на {{date}}"
  },
  "addPlant": {
    "title": "Додај ново растение",
    "subtitle": "Прикачи фотографија, и нашата вештачка интелигенција ќе го идентификува и ќе создаде план за нега.",
    "upload": {
      "click": "Кликни за да прикачиш",
      "drag": "или повлечи и пушти",
      "formats": "PNG, JPG, или WEBP"
    },
    "identifying": "Идентификување на твоето растение...",
    "identifying_desc": "Ова може да потрае малку. Нашата вештачка интелигенција ги анализира листовите, цветовите и стеблата.",
    "error": "Идентификацијата не успеа",
    "identifiedAs": "ВИ идентификуваше како:",
    "confidence": "{{percent}}% сигурност",
    "nicknameLabel": "Прекар за твоето растение:",
    "careSummary": "Краток преглед на нега:",
    "sunlight": "Сончева светлина:",
    "watering": "Наводнување:",
    "saveButton": "Зачувај го растението во колекцијата",
    "savingButton": "Зачувување...",
    "differentPhotoButton": "Користи друга фотографија",
    "errors": {
      "fileProcess": "Не може да се прочита или обработи избраната датотека.",
      "saveFailed": "Неуспешно зачувување на растението. Меморијата на уредот можеби е полна."
    }
  },
  "plantDetail": {
    "careProfile": "Профил за нега",
    "sunlight": "Сончева светлина",
    "watering": "Наводнување",
    "soil": "Почва",
    "fertilizer": "Ѓубриво",
    "temp": "Темп.",
    "humidity": "Влажност",
    "progressPhotos": "Фотографии од напредокот",
    "uploading": "Прикачување...",
    "tasksAndReminders": "Задачи и потсетници",
    "due": "Рок: {{date}}",
    "markAsDone": "Означи како завршено",
    "noPendingTasks": "Нема задачи на чекање. Браво!",
    "askAI": "Прашај ја Plantia ВИ",
    "conversationHistory": "Историја на разговори",
    "askAIDesc": "Имаш прашање за твоето {{plantName}}? Опиши го проблемот, додај фотографија ако е од помош, и нашиот ВИ асистент ќе ти даде совет.",
    "yourQuestion": "Твоето прашање",
    "questionPlaceholder": "на пр., Зошто листовите стануваат жолти и кршливи на рабовите?",
    "addPhoto": "Додај фотографија",
    "changePhoto": "Промени фотографија",
    "removeImage": "Отстрани слика",
    "askButton": "Прашај ја ВИ",
    "thinking": "Размислува...",
    "aiIsThinking": "Plantia ВИ размислува...",
    "aiIsThinkingDesc": "Ги анализира твоето прашање и фотографија за да го најде најдобриот совет.",
    "aiError": "Грешка кај ВИ асистентот",
    "tryAgain": "Обиди се повторно",
    "yourQuestionWas": "Твоето прашање:",
    "aiAnswer": "Одговор од Plantia ВИ:",
    "askAnother": "Постави друго прашање",
    "dangerZone": "Опасна зона",
    "deleteThisPlant": "Избриши го ова растение",
    "deleteThisPlantDesc": "Трајно отстрани го ова растение и сите негови податоци, вклучувајќи фотографии и задачи.",
    "deleteButton": "Избриши растение",
    "deletingButton": "Бришење...",
    "deleteConfirm": "Дали си сигурен/а дека сакаш да го избришеш „{{plantName}}“? Оваа акција е трајна и не може да се врати.",
    "deleteError": "Не може да се избрише растението. Обиди се повторно.",
    "plantNotFound": "Растението не е пронајдено",
    "plantNotFoundDesc": "Растението што го бараш не постои.",
    "goToDashboard": "Оди на почетна"
  },
  "settings": {
    "title": "Поставки",
    "subtitle": "Управувај со преференциите и податоците на апликацијата.",
    "appearance": "Изглед",
    "theme": "Тема",
    "light": "Светла",
    "dark": "Темна",
    "system": "Системска",
    "language": "Јазик",
    "notifications": "Известувања",
    "taskReminders": "Потсетници за задачи во позадина",
    "notifStatus": {
      "enabled_sync": "Ќе добиваш потсетници за задачи, дури и кога апликацијата е затворена.",
      "enabled_no_sync": "Потсетниците се вклучени. Известувањата може да се појават само кога апликацијата е отворена.",
      "disabled": "Овозможи за да добиваш дневни потсетници за задачи.",
      "denied": "Известувањата се блокирани. Овозможи ги во поставките на прелистувачот за оваа страница.",
      "unsupported": "Известувањата не се достапни во оваа околина (на пр., iframe или не-HTTPS)."
    },
    "dangerZone": "Опасна зона",
    "clearAllData": "Избриши ги сите податоци",
    "clearAllDataDesc": "Трајно избриши ја целата твоја колекција на растенија, вклучувајќи ги сите фотографии и задачи.",
    "deleteAllButton": "Избриши ги сите податоци",
    "clearDataConfirm": "Дали си сигурен/а дека сакаш да ги избришеш сите податоци за растенијата? Оваа акција не може да се врати.",
    "clearDataSuccess": "Сите податоци се избришани.",
    "themeError": "Не може да се зачува преференцијата за тема. Вашиот прелистувач можеби го блокира пристапот до меморијата.",
    "notifEnableError": "Се појави неочекувана грешка при овозможување на известувањата."
  },
  "tasks": {
    "title": "Задачи",
    "today": "Денешни задачи",
    "week": "Неделни задачи",
    "toDo": "За правење",
    "completed": "Завршени",
    "noTasksToday": "Нема закажани задачи за денес.",
    "noTasksWeek": "Нема закажани задачи за оваа недела.",
    "for": "За: {{plantName}}",
    "doneDate": "Завршено: {{date}}",
    "dueDate": "Рок: {{date}}",
    "type": {
      "water": "Наводни растение",
      "fertilize": "Наѓубри",
      "prune": "Исечи",
      "repot": "Пресади",
      "custom": "Прилагодена задача"
    }
  },
  "analytics": {
    "title": "Аналитичка табла",
    "totalPlants": "Вкупно растенија",
    "uniqueSpecies": "Уникатни видови",
    "photosTaken": "Направени фотографии",
    "tasksThisWeek": "Задачи оваа недела",
    "plantsByLocation": "Растенија по локација",
    "unassigned": "Недоделени",
    "error": "Грешка при вчитување на аналитиката",
    "noData": "Сè уште нема податоци",
    "noDataDesc": "Додај растение за да започнеш да ја гледаш аналитиката на твојата колекција.",
    "addPlant": "Додај растение"
  },
  "errors": {
    "gemini": {
      "emptyResponse": "Добиен е празен одговор од ВИ сервисот.",
      "invalidResponse": "ВИ сервисот врати невалиден одговор. Обидете се повторно.",
      "invalidApiKey": "API клучот за Google AI е невалиден или недостасува. Проверете ја вашата конфигурација.",
      "unknownIdentify": "Се појави неочекувана грешка при идентификација на растението.",
      "unknownAsk": "Се појави неочекувана грешка додека го прашувавте ВИ."
    }
  },
  "sw": {
    "notification": {
      "title": "Plantia Потсетник за задачи",
      "body_one": "Имаш {{count}} задача за растенија да ја завршиш денес!",
      "body_other": "Имаш {{count}} задачи за растенија да ги завршиш денес!"
    }
  }
};

let savedLang = 'en';
try {
  // Use localStorage for synchronous access to avoid Suspense.
  // This ensures the correct language is loaded on initialization.
  savedLang = localStorage.getItem('plantia_language') || 'en';
} catch (error) {
  console.error("Could not access localStorage for language, defaulting to 'en'.", error);
}


i18n
  .use(initReactI18next)
  .init({
    lng: savedLang,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources: {
      en: {
        translation: enTranslations,
      },
      mk: {
        translation: mkTranslations,
      }
    },
    // Suspense is no longer needed because there is no asynchronous loading.
    react: {
      useSuspense: false,
    },
  });

export default i18n;
