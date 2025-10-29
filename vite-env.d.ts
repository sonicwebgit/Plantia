// FIX: Removed environment variable type definitions for keys that are no longer accessed via `import.meta.env`.
// The project now uses `process.env` for these keys.
interface ImportMetaEnv {
  // Other VITE-prefixed variables for this project would be defined here.
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// This comment is added to re-trigger the commit button in the UI.
