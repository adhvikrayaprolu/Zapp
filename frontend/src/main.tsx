import * as React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { registerBackendAuditSink } from "@/shared/audit/backendSink";
import { AppErrorBoundary } from "@/shared/components/AppErrorBoundary";
import "./styles/index.css";

// console.log("ENV CHECK:", import.meta.env)
// console.log("SUPABASE URL:", import.meta.env.VITE_SUPABASE_URL)

registerBackendAuditSink();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
  
