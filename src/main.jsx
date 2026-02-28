import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { NotesProvider } from './context/NotesContext.jsx'
import { registerSW } from 'virtual:pwa-register'

// Global intercept for the PWA install prompt.
// This ensures we catch the event before React hydration finishes.
window.__DEFERRED_PROMPT__ = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__DEFERRED_PROMPT__ = e;
  window.dispatchEvent(new Event('deferred-prompt-captured'));
});

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NotesProvider>
      <App />
    </NotesProvider>
  </StrictMode>,
)