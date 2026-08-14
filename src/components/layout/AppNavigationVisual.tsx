import { Fragment, type ReactNode } from "react";

import { COPY } from "@/lib/constants/copy";
import {
  MAIN_NAV_ITEMS,
  MOBILE_NAV_ITEMS,
  PUBLIC_MOBILE_NAV_ITEMS,
  PUBLIC_NAV_ITEMS,
  PUBLIC_SIDEBAR_FOOTER_ITEMS,
  SIDEBAR_FOOTER_ITEMS,
} from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { VoopleMark } from "@/components/brand/VoopleMark";

export type NavigationDestinationRenderProps = {
  href: string;
  label: string;
  className: string;
  active: boolean;
  children: ReactNode;
};

export type NavigationDestinationRenderer = (
  props: NavigationDestinationRenderProps,
) => ReactNode;

type NavigationVisualProps = {
  pathname: string;
  renderDestination: NavigationDestinationRenderer;
  notificationBadge?: ReactNode;
  mode?: "authenticated" | "public";
};

type AppSidebarVisualProps = NavigationVisualProps & {
  navAfter?: ReactNode;
  footerAfter?: ReactNode;
};

export function AppSidebarVisual({
  pathname,
  renderDestination,
  notificationBadge,
  navAfter,
  footerAfter,
  mode = "authenticated",
}: AppSidebarVisualProps) {
  const navigationItems = mode === "public" ? PUBLIC_NAV_ITEMS : MAIN_NAV_ITEMS;
  const footerItems =
    mode === "public" ? PUBLIC_SIDEBAR_FOOTER_ITEMS : SIDEBAR_FOOTER_ITEMS;

  return (
    <aside
      data-nosnippet
      className="voople-sidebar fixed left-0 top-0 hidden h-full w-[var(--voople-sidebar-width)] shrink-0 flex-col lg:flex"
    >
      <div className="voople-sidebar__brand shrink-0 px-5 pb-7 pt-7">
        {renderDestination({
          href: "/feed",
          label: COPY.appName,
          active: pathname === "/feed",
          className:
            "inline-flex items-center gap-2.5 text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--foreground)] transition-opacity hover:opacity-85",
          children: <><VoopleMark className="h-8 w-8" />{COPY.appName}</>,
        })}
      </div>

      <nav
        className="voople-sidebar__nav voople-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3"
        aria-label="Основная навигация"
      >
        {navigationItems.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Fragment key={href}>
              {renderDestination({
                href,
                label,
                active,
                className: cn(
                  "voople-sidebar__link relative flex items-center gap-3 rounded-[var(--app-radius-lg)] px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[var(--app-accent-soft)] text-[var(--foreground)]"
                    : "text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[color-mix(in_srgb,var(--foreground)_88%,transparent)]",
                ),
                children: (
                  <>
                    {active && (
                      <span
                        aria-hidden
                        className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-[var(--theme-accent)]"
                      />
                    )}
                    <span className="relative inline-flex shrink-0">
                      <Icon
                        className="h-5 w-5"
                        strokeWidth={active ? 2.25 : 1.75}
                      />
                      {href === "/notifications" && notificationBadge}
                    </span>
                    {label}
                  </>
                ),
              })}
            </Fragment>
          );
        })}
      </nav>

      {navAfter}

      <div className="voople-sidebar__footer shrink-0 border-t border-[var(--app-border)] px-3 pb-7 pt-5">
        {footerItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href) && href !== "/login";
          return (
            <Fragment key={href}>
              {renderDestination({
                href,
                label,
                active,
                className: cn(
                  "flex w-full items-center gap-3 rounded-[var(--app-radius-lg)] px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[var(--app-accent-soft)] text-[var(--foreground)]"
                    : "text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[color-mix(in_srgb,var(--foreground)_88%,transparent)]",
                ),
                children: (
                  <>
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                    {label}
                  </>
                ),
              })}
            </Fragment>
          );
        })}
        {footerAfter}
      </div>
    </aside>
  );
}

export function AppBottomNavigationVisual({
  pathname,
  renderDestination,
  notificationBadge,
  mode = "authenticated",
}: NavigationVisualProps) {
  const navigationItems =
    mode === "public" ? PUBLIC_MOBILE_NAV_ITEMS : MOBILE_NAV_ITEMS;

  return (
    <nav
      data-nosnippet
      className="voople-bottom-nav pointer-events-none fixed bottom-0 left-0 right-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
      aria-label="Основная навигация"
    >
      <ul className="pointer-events-auto flex h-[3.625rem] items-center gap-0.5 rounded-full border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_92%,transparent)] px-2 shadow-[var(--app-shadow-nav)] backdrop-blur-xl">
        {navigationItems.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              {renderDestination({
                href,
                label,
                active,
                className: cn(
                  "relative flex min-w-[4.25rem] flex-col items-center gap-0.5 rounded-full border-0 bg-transparent px-2.5 py-2 text-[10px] font-medium tracking-wide transition-all duration-200",
                  active
                    ? "text-[var(--foreground)]"
                    : "text-[var(--app-muted)] hover:text-[color-mix(in_srgb,var(--foreground)_82%,transparent)]",
                ),
                children: (
                  <>
                    <span className="relative inline-flex">
                      <Icon
                        className="h-5 w-5"
                        strokeWidth={active ? 2.25 : 1.75}
                      />
                      {href === "/notifications" && notificationBadge}
                    </span>
                    <span>{label}</span>
                    <span
                      aria-hidden
                      className="voople-nav-active-indicator"
                      data-active={active ? "true" : "false"}
                    />
                  </>
                ),
              })}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
