import { AudioLines, Bell, CircleHelp, Home, MessageCircle, Search, ShoppingBag, UserRound } from "lucide-react";

import { COPY } from "./copy";

export const MAIN_NAV_ITEMS = [
  {
    href: "/messages",
    label: COPY.messages,
    icon: MessageCircle,
    match: (p: string) => p.startsWith("/messages"),
  },
  {
    href: "/search",
    label: COPY.search,
    icon: Search,
    match: (p: string) => p.startsWith("/search"),
  },
  {
    href: "/notifications",
    label: COPY.notifications,
    icon: Bell,
    match: (p: string) => p.startsWith("/notifications"),
  },
  {
    href: "/shop",
    label: COPY.shop,
    icon: ShoppingBag,
    match: (p: string) => p.startsWith("/shop"),
  },
] as const;

export const PROFILE_NAV_ITEM = {
  href: "/me",
  label: COPY.profile,
  icon: UserRound,
  match: (p: string) => p === "/me",
} as const;

/** Mobile keeps four daily destinations; activity moves to the current surface header. */
export const MOBILE_NAV_ITEMS = [
  { ...MAIN_NAV_ITEMS[0], label: "Войс", icon: AudioLines },
  MAIN_NAV_ITEMS[1],
  MAIN_NAV_ITEMS[2],
  PROFILE_NAV_ITEM,
] as const;

export const PUBLIC_NAV_ITEMS = [
  { href: "/feed", label: COPY.feed, icon: Home, match: (p: string) => p === "/feed" || p.startsWith("/feed/") },
  MAIN_NAV_ITEMS[1],
] as const;

export const PUBLIC_MOBILE_NAV_ITEMS = PUBLIC_NAV_ITEMS;

export const PUBLIC_SIDEBAR_FOOTER_ITEMS = [
  { href: "/help", label: "Помощь", icon: CircleHelp },
] as const;
