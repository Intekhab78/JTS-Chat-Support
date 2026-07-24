import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { WebsiteProvider } from "./context/WebsiteContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { CurrencyProvider } from "./context/CurrencyContext.jsx";
import "./styles/global.css";

// Unregister any stale service workers from previous PWA builds/port usage
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

// Auto-recover from dynamic module preload errors (e.g., after new deployments or stale browser cache)
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    console.warn("[Vite] Preload error detected, automatically refreshing page manifest...");
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AuthProvider>
        <WebsiteProvider>
          <CurrencyProvider>
            <SocketProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </SocketProvider>
          </CurrencyProvider>
        </WebsiteProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
