/** The icon for each item kind, shared by Draw, the Season Pass and the Wiki. Names live in itemNames.ts. */
import { BellRing, Image, LayoutGrid, MonitorPlay, Snowflake, Sparkles, Type, Upload, type LucideIcon } from "lucide-react";
import { itemById, type ItemKind } from "./gachaContent";

export { itemFullName, itemKindLine, itemTitle, KIND_NAME } from "./itemNames";

export const ITEM_ICON: Record<ItemKind, LucideIcon> = {
  "streak-freeze": Snowflake,
  "alert-sound": BellRing,
  font: Type,
  "name-flair": Sparkles,
  wallpaper: Image,
  boot: MonitorPlay,
  "layout-slot": LayoutGrid,
  "custom-upload": Upload,
};

export function itemIcon(id: string): LucideIcon {
  return ITEM_ICON[itemById(id)?.kind ?? "wallpaper"];
}
