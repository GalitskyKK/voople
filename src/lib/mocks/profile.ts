import { resolveCustomization } from "@/lib/customization/resolve";

import type { PostViewModel, ProfileViewModel } from "@/types/domain";

const mintiCustomization = resolveCustomization({
  themePrimary: "#1a0b1e",
  themeAccent: "#b0367a",
  bannerId: "minti",
  bannerValue: { color: "#2d1b4e" },
  avatarRingId: "glow-purple",
  nicknameColor: "#f9a8d4",
  nicknameGradient: true,
  profileEffectId: "ladybugs",
  feedCardStyleId: "sakura",
  avatarDecorationId: "sparkle",
});

const defaultCustomization = resolveCustomization({});

export const MOCK_PROFILE: ProfileViewModel = {
  id: "mock-user-id",
  username: "minti",
  displayName: "Minti | Любовь",
  bio: "Профиль с купленной темой (для теста assets из /public/customization)",
  createdAt: "2017-11-19T00:00:00.000Z",
  subscriptionStartedAt: "2026-04-11T00:00:00.000Z",
  customization: {
    ...mintiCustomization,
    bannerValue: {
      color: mintiCustomization.themePrimary,
      url: mintiCustomization.assets.bannerUrl ?? undefined,
    },
  },
  status: {
    moodValue: 7,
    thought: "Хочу домой",
    trackTitle: "Название",
    trackArtist: "Исполнитель",
  },
  stats: { posts: 42, followers: 1280, following: 312, views: 9800 },
};

export const MOCK_PROFILE_DEFAULT: ProfileViewModel = {
  ...MOCK_PROFILE,
  id: "default-user",
  username: "demo",
  displayName: "Demo User",
  bio: "Дефолтное оформление без покупок в магазине",
  customization: {
    ...defaultCustomization,
    bannerValue: { color: defaultCustomization.themePrimary },
  },
  status: { thought: "Обычный профиль" },
};

export const MOCK_POSTS: PostViewModel[] = [
  {
    id: "1",
    author: {
      username: "minti",
      displayName: "Minti | Любовь",
      customization: MOCK_PROFILE.customization,
    },
    text: "Сегодня тихий вечер, хочется просто послушать музыку.",
    likeCount: 24,
    replyCount: 3,
    viewCount: 140,
    repostCount: 1,
    createdAt: "10 мин. назад",
  },
  {
    id: "status-minti",
    kind: "status",
    author: {
      username: "minti",
      displayName: "Minti | Любовь",
      customization: MOCK_PROFILE.customization,
    },
    status: {
      moodValue: 7,
      thought: "Хочу домой",
      trackTitle: "Название",
      trackArtist: "Исполнитель",
    },
    likeCount: 8,
    replyCount: 0,
    viewCount: 64,
    repostCount: 0,
    createdAt: "25 мин. назад",
  },
  {
    id: "2",
    author: {
      username: "demo",
      displayName: "Demo User",
      customization: MOCK_PROFILE_DEFAULT.customization,
    },
    text: "Пост без кастомной темы — только дефолт.",
    likeCount: 12,
    replyCount: 1,
    viewCount: 78,
    repostCount: 0,
    createdAt: "1 ч. назад",
  },
  {
    id: "3",
    author: {
      username: "minti",
      displayName: "Minti | Любовь",
      customization: MOCK_PROFILE.customization,
    },
    text: "Кто тоже ждёт выходные?",
    likeCount: 5,
    replyCount: 0,
    viewCount: 31,
    repostCount: 0,
    createdAt: "2 ч. назад",
  },
];

export function getPostsForUser(username: string): PostViewModel[] {
  return MOCK_POSTS.filter((p) => p.author.username === username);
}
