import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { COPY } from "@/lib/constants/copy";
import { VoopleMark } from "@/components/brand/VoopleMark";
import { IconButton } from "@/components/ui/IconButton";
import type { NavigationDestinationRenderer } from "./AppNavigationVisual";

export function SidebarHeaderVisual({ pathname, mode, collapsed, onCollapsedChange, renderDestination }: {
  pathname: string; mode: "authenticated" | "public"; collapsed: boolean;
  onCollapsedChange?: (collapsed: boolean) => void; renderDestination: NavigationDestinationRenderer;
}) {
  return <>
      <div className="voople-sidebar__brand flex shrink-0 items-center justify-between gap-2 px-4 pb-7 pt-7">
        {renderDestination({
          href: mode === "authenticated" ? "/messages" : "/feed",
          label: COPY.appName,
          active: pathname === (mode === "authenticated" ? "/messages" : "/feed"),
          className:
            "inline-flex items-center gap-2.5 text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--foreground)] transition-opacity hover:opacity-85",
          children: <><VoopleMark className="h-8 w-8" /><span className="voople-sidebar__label voople-wordmark">{COPY.wordmark}</span></>,
        })}
      </div>
      {onCollapsedChange ? <div className="voople-sidebar__toggle flex shrink-0 justify-center px-3 pb-1">
          <IconButton
            label={collapsed ? "Развернуть боковую панель" : "Свернуть боковую панель"}
            tooltipSide="right"
            onClick={() => onCollapsedChange(!collapsed)}
            className="voople-sidebar__collapse grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </IconButton>
      </div> : null}

  </>;
}
