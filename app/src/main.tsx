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
import "./styles/station-ui.css";
import "./styles/gacha-stage.css";
import "./styles/calendar-tw.css";
import "./styles/cardskins.css";
import "./styles/showcase.css";
import "./styles/news.css";
import "./styles/hub.css";
import "./styles/profile.css";
import "./styles/achievements.css";
import "./styles/pass.css";
import "./styles/checkin.css";
import "./styles/quests.css";
import { App } from "./App";
import { AppBoundary, AppErrorScreen } from "./components/ErrorBoundary";
import { hydrateContentFromStore } from "./content/updateContent.ts";
import { ToastProvider } from "./state/Toast";
import { CelebrateProvider } from "./state/Celebrate";

// Restore the last applied CMS content (if any) before the first paint / draws.
hydrateContentFromStore();

// The boot screen preview is a design tool: it is only built into dev runs, never the shipped app.
const BootDemo = import.meta.env.DEV ? lazy(() => import("./boot/BootDemo").then((m) => ({ default: m.BootDemo }))) : null;
const showDemo = BootDemo != null && new URLSearchParams(location.search).get("boot") === "demo";

// Preview the "Something went wrong" screen without a crash: http://localhost:1420/?errorPreview=1 (any build; it only draws the screen).
const showErrorPreview = new URLSearchParams(location.search).get("errorPreview") === "1";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppBoundary>
      <ToastProvider>
        <CelebrateProvider>
        {showErrorPreview ? (
          <AppErrorScreen message="Rendered more hooks than during the previous render." />
        ) : showDemo && BootDemo ? (
          <Suspense fallback={null}>
            <BootDemo />
          </Suspense>
        ) : (
          <App />
        )}
        </CelebrateProvider>
      </ToastProvider>
    </AppBoundary>
  </StrictMode>,
);
