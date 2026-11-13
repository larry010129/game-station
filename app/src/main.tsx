import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/outfit/200.css";
import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "./styles/app.css";
import "./styles/meta.css";
import { App } from "./App";
import { ToastProvider } from "./state/Toast";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
