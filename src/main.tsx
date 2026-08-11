import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import App from "./App";
import { LandingPage } from "@/pages/LandingPage";
import { ToastProvider } from "@/components/toast";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

function Root() {
  if (!convexUrl) {
    // No Convex backend configured (no VITE_CONVEX_URL at build time).
    // Render the static landing page so the site is never blank; auth and
    // dashboard routes require the backend and fall back to the landing page.
    return (
      <StrictMode>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </StrictMode>
    );
  }

  const convex = new ConvexReactClient(convexUrl);

  return (
    <StrictMode>
      <ConvexAuthProvider client={convex}>
        <App />
      </ConvexAuthProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
