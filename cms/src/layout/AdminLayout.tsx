import { PanelLeft } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import {
  AnimatedSidebarInset,
  AnimatedSidebarProvider,
  AnimatedSidebarTrigger,
} from "@/components/ui/animated-sidebar";
import { CMS_NAV, CmsSidebar } from "@/components/ui/sidebar-nav";
import { useDraft } from "../state/DraftContext";
import { cn } from "@/lib/utils";
import { SaveAndPush } from "../components/PushScheduler";

export function AdminLayout() {
  const { dirty, saving, persistMode, publishErrors } = useDraft();
  const location = useLocation();
  const active = CMS_NAV.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
  );
  const syncing = saving || dirty;

  return (
    <AnimatedSidebarProvider>
      <CmsSidebar
        persistMode={persistMode}
        dirty={dirty}
        saving={saving}
        blockCount={publishErrors.length}
      />
      <AnimatedSidebarInset>
        {/* Translucent over the page colour, blurred, with the toggle and breadcrumb at the start. */}
        <header className="sticky top-0 z-20 flex h-[var(--cms-header-height)] shrink-0 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-[7px] md:px-5">
          <AnimatedSidebarTrigger className="text-muted transition-colors hover:bg-secondary hover:text-foreground">
            <PanelLeft aria-hidden="true" className="size-4" />
          </AnimatedSidebarTrigger>
          <div aria-hidden className="h-5 w-px bg-border" />
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm text-muted">
            <span>Operate</span>
            <span aria-hidden className="text-muted/50">/</span>
            <span className="truncate font-medium text-foreground">{active?.label ?? "CMS"}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted" role="status">
            <span aria-hidden className={cn("h-2 w-2 rounded-full", syncing ? "bg-warning" : "bg-[#1de9b6]")} />
            <span className="hidden sm:inline">{saving ? "Saving draft…" : dirty ? "Unsaved changes" : "Draft synced"}</span>
          </div>
          <div aria-hidden className="h-5 w-px bg-border" />
          <SaveAndPush />
        </header>
        <div className="min-w-0 flex-1 p-5 md:p-7">
          <Outlet />
        </div>
      </AnimatedSidebarInset>
    </AnimatedSidebarProvider>
  );
}
