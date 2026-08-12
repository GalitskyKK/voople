import { Bell, CircleHelp, Home, LogOut, MessageCircle, Search, Settings, ShoppingBag, Sparkles, User } from "lucide-react";

import { COPY } from "./copy";

export const MAIN_NAV_ITEMS = [
  {
    href: "/feed",
    label: COPY.feed,
    icon: Home,
    match: (p: string) => p === "/feed" || p.startsWith("/feed/"),
  },
  {
    href: "/explore",
    label: COPY.search,
    icon: Search,
    match: (p: string) => p.startsWith("/explore"),
  },
  {
    href: "/messages",
    label: COPY.messages,
    icon: MessageCircle,
    match: (p: string) => p.startsWith("/messages"),
  },
  {
    href: "/notifications",
    label: COPY.notifications,
    icon: Bell,
    match: (p: string) => p.startsWith("/notifications"),
  },
  {
    href: "/events",
    label: "События",
    icon: Sparkles,
    match: (p: string) => p.startsWith("/events"),
  },
  {
    href: "/me",
    label: COPY.profile,
    icon: User,
    match: (p: string) => p === "/me",
  },
] as const;

/** Mobile bottom bar — без «Поиск» (есть в хедере ленты). */
export const MOBILE_NAV_ITEMS = MAIN_NAV_ITEMS.filter((item) => item.href !== "/explore" && item.href !== "/events");

export const SIDEBAR_FOOTER_ITEMS = [
  { href: "/shop", label: COPY.shop, icon: ShoppingBag },
  { href: "/help", label: "Помощь", icon: CircleHelp },
  { href: "/settings", label: "Настройки", icon: Settings },
  { href: "/login", label: COPY.logout, icon: LogOut },
] as const;
