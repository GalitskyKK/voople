"use client";

import type { LucideIcon } from "lucide-react";
import { Heart, HelpCircle, MessageCircle, Palette, Radio, Repeat2, UserPlus } from "lucide-react";

import type { NotificationView } from "@/types/notifications";

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
    case "profile_reaction":
      return "отреагировал(а) на ваш профиль";
    case "profile_canvas_draw":
      return "Кто-то оставил рисунок на вашей карточке";
    case "question":
      return "Вам задали анонимный вопрос";
    case "room_invite":
      return "приглашает вас в комнату";
    default:
      return "— новое уведомление";
  }
}

/** Типы уведомлений без имени актёра (анонимные). */
const ANONYMOUS_NOTIF_TYPES = new Set<string>(["profile_canvas_draw", "question"]);

export function notificationText(type: string, actorName: string) {
  if (ANONYMOUS_NOTIF_TYPES.has(type)) {
    return notificationActionText(type);
  }
  const action = notificationActionText(type);
  return actorName ? `${actorName} ${action}` : action;
}

export function notificationHref(notification: NotificationView) {
  if (notification.type === "room_invite" && notification.roomInvite?.id) {
    return `/room-invites/${notification.roomInvite.id}`;
  }
  if (notification.type === "room_invite") return "/notifications";
  if (
    (notification.type === "profile_canvas_draw" || notification.type === "question") &&
    notification.profileUsername
  ) {
    return `/${notification.profileUsername}`;
  }

  if (
    (notification.type === "follow" || notification.type === "profile_reaction") &&
    notification.actor
  ) {
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
    case "question":
      return HelpCircle;
    case "room_invite":
      return Radio;
    case "like":
    case "profile_reaction":
    default:
      return Heart;
  }
}
