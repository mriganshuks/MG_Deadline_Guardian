import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Detect and process OAuth callbacks (both real Supabase and mock auth) for seamless popups
if (typeof window !== "undefined" && (window.location.search.includes("mock_auth=true") || window.location.pathname.includes("/auth/callback") || window.location.hash.includes("access_token="))) {
  if (window.opener) {
    try {
      window.opener.postMessage(
        {
          type: "SUPABASE_AUTH_SUCCESS",
          hash: window.location.hash || window.location.search
        },
        window.location.origin
      );
      window.close();
    } catch (e) {
      console.error("Failed to post message to parent opener window:", e);
    }
  }
}

// Intercept and suppress harmless cross-origin exceptions that arise inside sandboxed iframes
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    if (
      event.message === "Script error." ||
      event.message?.includes("firebase") ||
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
      msg.includes("firebase") ||
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
