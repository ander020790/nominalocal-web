import { createRoot } from "react-dom/client";
import "./setup";
import { bootstrapGeneratedSiteAnalytics } from "./analytics.ts";
import App from "./App.tsx";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "./components/error-boundary/error-fallback";
import { reportCaughtError } from "./lib/report-caught-error";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container #root was not found.");
}

bootstrapGeneratedSiteAnalytics();

const isPreviewHost = /live-preview|localhost|127\.0\.0\.1/.test(
  window.location.hostname,
);

if ("serviceWorker" in navigator) {
  if (isPreviewHost) {
    // Limpia service workers viejos que puedan servir una versión anterior
    // de la app (pantalla en blanco por assets desactualizados).
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        registrations.forEach((registration) => void registration.unregister()),
      )
      .catch(() => undefined);
  } else if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // La app sigue funcionando aunque el navegador no permita el service worker.
      });
    });
  }
}

createRoot(container, { onCaughtError: reportCaughtError }).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
  </ErrorBoundary>,
);

// Red de seguridad: si la app no logra montar (por ejemplo, por una versión
// anterior cacheada por el service worker), muestra una salida en vez de una
// pantalla en blanco y permite limpiar la caché.
window.setTimeout(() => {
  const root = document.getElementById("root");
  if (!root || root.childElementCount > 0) return;
  root.innerHTML = [
    '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;font-family:Inter,system-ui,sans-serif;color:#1f2437;background:#f5f6fa">',
    '<p style="font-size:15px;font-weight:600;margin:0">No pudimos cargar la aplicación</p>',
    '<p style="font-size:13px;color:#5b6478;max-width:420px;margin:0">Suele pasar cuando el navegador guardó una versión anterior. Limpia la caché y vuelve a entrar.</p>',
    '<button id="nc-reload" style="border:0;border-radius:10px;background:#342bb1;color:#fff;font-size:13px;font-weight:600;padding:10px 18px;cursor:pointer">Recargar y limpiar caché</button>',
    "</div>",
  ].join("");
  document.getElementById("nc-reload")?.addEventListener("click", async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } finally {
      window.location.reload();
    }
  });
}, 6000);
