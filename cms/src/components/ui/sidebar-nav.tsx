/**
 * The CMS sidebar, built on the Animated Sidebar (beui.dev): it folds to an icon rail, becomes a drawer on a
 * phone, glides one highlight between rows, and toggles with Ctrl/Cmd + B. Wired to React Router.
 */
import {
  LayoutDashboard,
  Palette,
  Package,
  Percent,
  GalleryVerticalEnd,
  LayoutGrid,
  Image,
  CalendarDays,
  Eye,
  Rocket,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarRail,
} from "@/components/ui/animated-sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type CmsNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export const CMS_NAV: CmsNavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/themes", label: "Themes", icon: Palette },
  { to: "/items", label: "Items", icon: Package },
  { to: "/cards", label: "Cards", icon: GalleryVerticalEnd },
  { to: "/widgets", label: "Widgets", icon: LayoutGrid },
  { to: "/odds", label: "Odds", icon: Percent },
  { to: "/banners", label: "Banners", icon: Image },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/preview", label: "Preview", icon: Eye },
  { to: "/releases", label: "Releases", icon: Rocket },
];

/** Hidden while the rail is folded; the folded rail shows only the status dot. */
const WHEN_EXPANDED = "group-data-[state=collapsed]/sidebar:hidden";

export function CmsSidebar({
  persistMode,
  dirty,
  saving,
  blockCount,
}: {
  persistMode: "api" | "localStorage";
  dirty: boolean;
  saving: boolean;
  blockCount: number;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const status = blockCount > 0 ? "blocked" : persistMode !== "api" ? "local" : dirty || saving ? "saving" : "saved";
  const dot = { blocked: "bg-destructive-foreground", local: "bg-warning", saving: "bg-info", saved: "bg-[#1de9b6]" }[status];
  const dotLabel = {
    blocked: `${blockCount} publish ${blockCount === 1 ? "block" : "blocks"}`,
    local: "Browser storage only",
    saving: "Saving the draft",
    saved: "Draft saved",
  }[status];

  return (
    <AnimatedSidebar ariaLabel="Game Station CMS" collapsible="icon">
      <AnimatedSidebarHeader className="p-3 pb-2">
        <div className="flex min-h-11 items-center gap-3 overflow-hidden px-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-[var(--cms-brand)] text-[13px] font-semibold text-white">
            GS
          </div>
          <div className={cn("min-w-0 flex-1", WHEN_EXPANDED)}>
            <p className="truncate text-sm font-semibold leading-none text-foreground">Game Station</p>
            <p className="mt-1 text-[11px] leading-none text-muted">CMS · Operate</p>
          </div>
          <AnimatedSidebarClose className="ml-auto text-muted hover:bg-secondary md:hidden">
            <X aria-hidden="true" className="size-4" />
          </AnimatedSidebarClose>
        </div>
      </AnimatedSidebarHeader>

      <AnimatedSidebarContent className="px-2 pt-1">
        <AnimatedSidebarGroup className="pt-1">
          <AnimatedSidebarGroupLabel>Content</AnimatedSidebarGroupLabel>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              {CMS_NAV.map((item) => {
                const Icon = item.icon;
                const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <AnimatedSidebarMenuItem key={item.to}>
                    <AnimatedSidebarMenuButton
                      href={item.to}
                      soft
                      isActive={active}
                      icon={<Icon className="size-4" />}
                      onSelect={() => navigate(item.to)}
                    >
                      {item.label}
                    </AnimatedSidebarMenuButton>
                  </AnimatedSidebarMenuItem>
                );
              })}
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>
      </AnimatedSidebarContent>

      <AnimatedSidebarFooter className="gap-2">
        <div className={cn("space-y-2 px-1", WHEN_EXPANDED)}>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={persistMode === "api" ? "success" : "warning"}>
              {persistMode === "api" ? "Draft file" : "Browser only"}
            </Badge>
            <Badge variant={dirty || saving ? "info" : "outline"}>{saving ? "Saving" : dirty ? "Unsaved" : "Saved"}</Badge>
            {blockCount > 0 ? (
              <Badge variant="destructive">
                {blockCount} {blockCount === 1 ? "block" : "blocks"}
              </Badge>
            ) : null}
          </div>
          <p className="text-[11px] text-muted">Owner only · no login yet</p>
        </div>
        <div className="hidden justify-center py-1 group-data-[state=collapsed]/sidebar:flex">
          <span role="img" aria-label={dotLabel} title={dotLabel} className={cn("size-2.5 rounded-full", dot)} />
        </div>
      </AnimatedSidebarFooter>

      <AnimatedSidebarRail />
    </AnimatedSidebar>
  );
}
