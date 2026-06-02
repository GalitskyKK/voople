"use client";

import type { LucideIcon } from "lucide-react";
import { Heart, MessageCircle, Palette, Repeat2, UserPlus } from "lucide-react";

import type { NotificationView } from "@/server/services/notifications.service";

/** Текст после имени актёра (для inline-пина в UI). */
export function notificationActionText(type: string): string {
  switch (type) {
    case "like":
      return "оценил(а) ваш пост";
    case "follow":
      return "подписался(ась) на вас";
    case "reply":
      return "прокомментировал(а) ваш пост";
    case "repost":
      return "сделал(а) репост вашего поста";
    case "profile_canvas_draw":
      return "Кто-то оставил рисунок на вашей карточке";
    default:
      return "— новое уведомление";
  }
}

export function notificationText(type: string, actorName: string) {
  if (type === "profile_canvas_draw") {
    return notificationActionText(type);
  }
  const action = notificationActionText(type);
  return actorName ? `${actorName} ${action}` : action;
}

export function notificationHref(notification: NotificationView) {
  if (notification.type === "profile_canvas_draw" && notification.profileUsername) {
    return `/${notification.profileUsername}`;
  }

  if (notification.type === "follow" && notification.actor) {
    return `/${notification.actor.username}`;
  }

  if (
    (notification.type === "like" ||
      notification.type === "reply" ||
      notification.type === "repost") &&
    notification.referenceId
  ) {
    return `/post/${notification.referenceId}`;
  }

  if (notification.actor) return `/${notification.actor.username}`;
  return "/feed";
}

export function notificationIcon(type: string): LucideIcon {
  switch (type) {
    case "follow":
      return UserPlus;
    case "reply":
      return MessageCircle;
    case "repost":
      return Repeat2;
    case "profile_canvas_draw":
      return Palette;
    case "like":
    default:
      return Heart;
  }
}
