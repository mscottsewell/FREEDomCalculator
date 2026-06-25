import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import App from './App'
import { ErrorFallback } from './ErrorFallback'

import "./main.css"
import "./index.css"

// Purge any previously-installed service worker (from the earlier PWA setup).
//
// A stale SW keeps CONTROLLING already-open pages even after unregister() — and
// it intercepts requests, including React.lazy() dynamic imports, then fails
// them in environments that don't support service workers (the WebContainer dev
// sandbox), causing "Failed to fetch dynamically imported module" errors.
//
// unregister() only takes effect on the NEXT navigation, so if a worker is still
// controlling this page we purge it and force a single clean reload (guarded by
// sessionStorage so it can never loop).
async function purgeServiceWorkers() {
  if (!('serviceWorker' in navigator)) return
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    const hadController = !!navigator.serviceWorker.controller
    await Promise.all(registrations.map((r) => r.unregister()))

    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }

    // If a worker was registered or actively controlling this page, the current
    // document is still under its control — reload once to escape it cleanly.
    const needsReload =
      (registrations.length > 0 || hadController) &&
      !sessionStorage.getItem('sw-purged')
    if (needsReload) {
      sessionStorage.setItem('sw-purged', '1')
      window.location.reload()
    }
  } catch {
    /* ignore — best-effort cleanup */
  }
}

purgeServiceWorkers()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
