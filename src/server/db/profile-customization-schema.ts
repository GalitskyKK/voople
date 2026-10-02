import { boolean, jsonb, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const avatarTypeEnum = pgEnum("avatar_type", ["constructor", "photo"]);
export const bannerTypeEnum = pgEnum("banner_type", ["color", "pattern", "animated"]);

export const profileCustomization = pgTable("profile_customization", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bannerType: bannerTypeEnum("banner_type").notNull().default("color"),
  bannerValue: jsonb("banner_value").notNull().default({ color: "#1A0D2E" }),
  avatarType: avatarTypeEnum("avatar_type").notNull().default("constructor"),
  avatarData: jsonb("avatar_data").notNull().default({}),
  avatarDecorationId: varchar("avatar_decoration_id", { length: 100 }),
  feedCardStyleId: varchar("feed_card_style_id", { length: 100 }),
  animatedAvatarId: varchar("animated_avatar_id", { length: 100 }),
  appThemeId: varchar("app_theme_id", { length: 30 }),
  avatarRingId: varchar("avatar_ring_id", { length: 100 }),
  /** @deprecated Эффекты профиля заменены рамкой (profile_frame_id). Данные не удаляются. */
  profileEffectId: varchar("profile_effect_id", { length: 100 }),
  profileBackgroundId: varchar("profile_background_id", { length: 100 }),
  /** Рамка вокруг всей карточки (баннер+основа). Id пресета из frames-registry. */
  profileFrameId: varchar("profile_frame_id", { length: 100 }),
  /** Кастомный цвет рамки (Voople+), HEX. Аналог nickname_color. */
  frameColor: varchar("frame_color", { length: 20 }),
  /** Режим основы карточки: mirror (дефолт) · theme (градиент) · plain (не дублировать баннер). */
  cardBaseMode: varchar("card_base_mode", { length: 20 }),
  nameplateId: varchar("nameplate_id", { length: 100 }),
  nicknameColor: varchar("nickname_color", { length: 20 }),
  nicknameGradient: boolean("nickname_gradient").default(false),
  nicknameFont: varchar("nickname_font", { length: 20 }).notNull().default("sans"),
  nicknameEffect: varchar("nickname_effect", { length: 20 }).notNull().default("plain"),
  themePrimary: varchar("theme_primary", { length: 7 }).default("#0A0A0F"),
  themeAccent: varchar("theme_accent", { length: 7 }).default("#7B3AED"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
