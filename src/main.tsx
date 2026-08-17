import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {HelmetProvider} from 'react-helmet-async';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { initPwaInstaller } from './lib/pwaInstaller.ts';
import './index.css';

// Initialize PWA Installation Listener & ServiceWorker cleanly
if (typeof window !== "undefined") {
  initPwaInstaller();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const baseUrl = ((import.meta as any)?.env?.BASE_URL) || '/';
      const swUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}sw.js`;
      navigator.serviceWorker.register(swUrl).catch((err) => {
        console.warn('[PWA] ServiceWorker registration note:', err);
      });
    });
  }
}

// Guard against third-party cross-origin script errors (AdSense, Google CSE, tracking scripts)
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    if (event.message === "Script error." || (event.filename && !event.filename.includes(window.location.host))) {
      // Suppress cross-origin external script noise
      event.preventDefault?.();
      console.warn("[Safe Script Handler] Suppressed external cross-origin script error:", event.filename || "external");
      return true;
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reasonStr = String(event.reason?.message || event.reason || "");
    if (reasonStr.includes("Script error") || reasonStr.includes("adsbygoogle") || reasonStr.includes("RESOURCE_EXHAUSTED")) {
      event.preventDefault?.();
      console.warn("[Safe Promise Handler] Handled async notice:", reasonStr);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);

