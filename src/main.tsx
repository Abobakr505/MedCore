import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

async function registerMedCoreServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn(
      "[MedCore] Service Worker غير مدعوم في هذا المتصفح."
    );

    return;
  }

  if (!window.isSecureContext) {
    console.warn(
      "[MedCore] Service Worker يحتاج HTTPS أو localhost."
    );

    return;
  }

  try {
    const registration =
      await navigator.serviceWorker.register(
        "/sw.js",
        {
          scope: "/",
        }
      );

    console.log(
      "[MedCore] Service Worker registered:",
      registration.scope
    );

    await navigator.serviceWorker.ready;

    console.log(
      "[MedCore] Service Worker جاهز."
    );
  } catch (error) {
    console.error(
      "[MedCore] Service Worker registration failed:",
      error
    );
  }
}

registerMedCoreServiceWorker();

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <App />
  </StrictMode>
);
