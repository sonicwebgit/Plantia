import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register Service Worker only in supported environments
const canUseSW =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  window.isSecureContext && // Requires HTTPS or localhost
  window.top === window;    // Not in an iframe (like AI Studio preview)

if (canUseSW) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.warn('SW registration skipped:', err));
  });
} else {
    console.warn('Service worker disabled in this environment.');
}


const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);