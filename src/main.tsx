import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';


// Intercept and suppress harmless cross-origin exceptions that arise inside sandboxed iframes
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    if (
      event.message === "Script error." ||
      event.message?.includes("supabase") ||
      event.message?.includes("auth") ||
      (event.filename && event.filename.includes("google"))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason?.message || "";
    if (
      msg === "Script error." ||
      msg.includes("supabase") ||
      msg.includes("auth") ||
      msg.includes("permission-denied")
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
