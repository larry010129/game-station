import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/outfit/200.css";
import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
// Voices a theme can switch the UI into. Declared up front but only fetched when a
// theme actually uses one (the browser loads a face on first use, per script range).
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/space-grotesk/wght.css";
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "@fontsource-variable/lora/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./styles/app.css";
import "./styles/meta.css";
import "./styles/extras.css";
import "./styles/calendar-tw.css";
import { App } from "./App";
import { AppBoundary, AppErrorScreen } from "./components/ErrorBoundary";
import { ToastProvider } from "./state/Toast";

// The boot screen preview is a design tool: it is only built into dev runs, never the shipped app.
const BootDemo = import.meta.env.DEV ? lazy(() => import("./boot/BootDemo").then((m) => ({ default: m.BootDemo }))) : null;
const showDemo = BootDemo != null && new URLSearchParams(location.search).get("boot") === "demo";

// Preview the "Something went wrong" screen without a crash: http://localhost:1420/?errorPreview=1 (any build; it only draws the screen).
const showErrorPreview = new URLSearchParams(location.search).get("errorPreview") === "1";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppBoundary>
      <ToastProvider>
        {showErrorPreview ? (
          <AppErrorScreen message="Rendered more hooks than during the previous render." />
        ) : showDemo && BootDemo ? (
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
