import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { AdminLayout } from "./layout/AdminLayout";
import { DraftProvider, useDraft } from "./state/DraftContext";
import { BannersPage } from "./pages/BannersPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ItemsPage } from "./pages/ItemsPage";
import { CardsPage } from "./pages/CardsPage";
import { OddsPage } from "./pages/OddsPage";
import { PreviewPage } from "./pages/PreviewPage";
import { ReleasesPage } from "./pages/ReleasesPage";
import { ThemesPage } from "./pages/ThemesPage";
import { WidgetsPage } from "./pages/WidgetsPage";

function BootGate({ children }: { children: ReactNode }) {
  const { status, error, reload } = useDraft();
  if (status === "loading") {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-muted">
        Loading draft…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="max-w-md text-sm text-destructive-foreground">{error}</p>
        <button
          type="button"
          className="rounded border border-edge px-3 py-1.5 text-sm text-ink hover:bg-secondary"
          onClick={() => void reload()}
        >
          Retry
        </button>
      </div>
    );
  }
  return <>{children}</>;
}

export function App() {
  return (
    <DraftProvider>
      <BootGate>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="themes" element={<ThemesPage />} />
            <Route path="items" element={<ItemsPage />} />
            <Route path="cards" element={<CardsPage />} />
            <Route path="widgets" element={<WidgetsPage />} />
            <Route path="odds" element={<OddsPage />} />
            <Route path="banners" element={<BannersPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="preview" element={<PreviewPage />} />
            <Route path="releases" element={<ReleasesPage />} />
          </Route>
        </Routes>
      </BootGate>
    </DraftProvider>
  );
}
