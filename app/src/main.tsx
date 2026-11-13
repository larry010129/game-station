import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/outfit/200.css";
import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "./styles/app.css";
import "./styles/meta.css";
import "./styles/extras.css";
import { App } from "./App";
import { AppBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./state/Toast";

// The boot screen preview is a design tool: it is only built into dev runs, never the shipped app.
const BootDemo = import.meta.env.DEV ? lazy(() => import("./boot/BootDemo").then((m) => ({ default: m.BootDemo }))) : null;
const showDemo = BootDemo != null && new URLSearchParams(location.search).get("boot") === "demo";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppBoundary>
      <ToastProvider>
        {showDemo && BootDemo ? (
          <Suspense fallback={null}>
            <BootDemo />
          </Suspense>
        ) : (
          <App />
        )}
      </ToastProvider>
    </AppBoundary>
  </StrictMode>,
);
