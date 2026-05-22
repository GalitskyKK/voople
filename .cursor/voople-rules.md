## CURSOR RULES — VOOPLE (SENIOR LEVEL)

```markdown
# VOOPLE — CURSOR RULES

## STACK

Next.js 14 App Router · TypeScript strict · Tailwind CSS
tRPC v11 · Drizzle ORM · PostgreSQL (Supabase)
Supabase Realtime · Upstash Redis · Cloudflare R2
Zustand · React Query (via tRPC) · React Hook Form + Zod
APNG for profile animations · CSS for ring/nameplate animations
Media Session API for background audio playback

---

## ARCHITECTURE

### Rendering strategy per route

| Route | Strategy | Reason |
|---|---|---|
| `/feed` | SSR → client hydration | SEO irrelevant, fresh data |
| `/[username]` | ISR (revalidate: 60) | Public profiles, cacheable |
| `/messages` | CSR only | Private, real-time |
| `/explore` | SSR | Trending content |
| `/shop` | ISR (revalidate: 300) | Rarely changes |

### Data fetching rules

Server Components fetch directly via Drizzle — never via HTTP to own API.
Client Components use tRPC hooks exclusively.
Never mix: no `fetch('/api/...')` from client when tRPC exists.

```ts
// Server Component — direct DB call
const profile = await db.query.users.findFirst({
  where: eq(users.username, params.username),
  with: { customization: true, now: true }
})

// Client Component — tRPC only
const { data } = trpc.profile.getByUsername.useQuery({ username })
```

### tRPC procedure anatomy

Every procedure follows this exact structure:

```ts
export const voopRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateVoopSchema)           // Zod schema, separate file
    .output(VoopSchema)                // typed output always
    .mutation(async ({ ctx, input }) => {
      // 1. Authorization check
      // 2. Business logic
      // 3. Side effects (cache invalidation, notifications)
      // 4. Return typed response
    }),
})
```

### Cache invalidation strategy

Redis cache keys follow this convention:
```
profile:{userId}           TTL: 300s
feed:{userId}:cursor:{x}   TTL: 60s
now:{userId}               TTL: 30s
explore:trending           TTL: 300s
shop:season:current        TTL: 3600s
```

Invalidate on mutation via background job — never block response for cache ops.

---

## PROJECT STRUCTURE

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx              # Navbar wrapper
│   │   ├── feed/page.tsx
│   │   ├── explore/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── messages/
│   │   │   ├── page.tsx            # Chat list
│   │   │   └── [chatId]/page.tsx
│   │   └── [username]/
│   │       └── page.tsx            # Profile
│   └── api/
│       ├── trpc/[trpc]/route.ts
│       ├── webhooks/
│       │   └── yookassa/route.ts
│       └── og/route.tsx            # OG image generation
│
├── components/
│   ├── ui/                         # Primitives only — no business logic
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Slider.tsx              # Mood slider base
│   │   ├── Sheet.tsx
│   │   └── Toast.tsx
│   ├── profile/
│   │   ├── ProfileCard.tsx         # Orchestrator, delegates to sub-components
│   │   ├── ProfileBanner.tsx       # APNG or color banner
│   │   ├── ProfileAvatar.tsx       # Avatar + ring (CSS anim)
│   │   ├── ProfileEffect.tsx       # APNG effect overlay
│   │   ├── ProfileNowBlock.tsx     # Status block (no label)
│   │   ├── MoodSlider.tsx          # Slider with emoji thumb
│   │   ├── ProfileBadges.tsx
│   │   ├── ProfileReactions.tsx
│   │   ├── ProfileStats.tsx
│   │   └── StickyProfileHeader.tsx
│   ├── feed/
│   │   ├── Feed.tsx                # Virtualized list
│   │   ├── VoopCard.tsx
│   │   ├── VoopComposer.tsx
│   │   ├── VoopStateAttachment.tsx
│   │   ├── VoopActions.tsx
│   │   └── MiniProfilePopover.tsx
│   ├── avatar/
│   │   ├── AvatarBuilder.tsx       # Loaded lazily
│   │   ├── AvatarPreview.tsx
│   │   └── layers/                 # One file per layer type
│   ├── player/
│   │   ├── MiniPlayer.tsx          # Sticky bottom bar
│   │   ├── FullPlayer.tsx
│   │   └── PlaylistManager.tsx
│   ├── chat/
│   │   ├── ChatList.tsx
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   └── RecipientNowBar.tsx     # Shows recipient's now block in chat
│   ├── customization/
│   │   ├── CustomizationEditor.tsx
│   │   ├── LivePreview.tsx
│   │   ├── EffectPicker.tsx        # APNG effects grid
│   │   ├── BannerPicker.tsx
│   │   ├── RingPicker.tsx
│   │   └── NameplatePicker.tsx
│   └── shop/
│       ├── ShopPage.tsx
│       ├── MysteryDropCard.tsx
│       └── SeasonBundle.tsx
│
├── server/
│   ├── db/
│   │   ├── schema.ts               # All Drizzle tables
│   │   ├── index.ts                # DB client singleton
│   │   └── queries/                # Reusable query builders
│   │       ├── profile.ts
│   │       ├── feed.ts
│   │       └── shop.ts
│   ├── trpc/
│   │   ├── init.ts                 # createTRPCContext
│   │   ├── root.ts                 # AppRouter type export
│   │   └── routers/
│   │       ├── user.ts
│   │       ├── voop.ts
│   │       ├── feed.ts
│   │       ├── profile.ts
│   │       ├── now.ts
│   │       ├── playlist.ts
│   │       ├── chat.ts
│   │       ├── customization.ts
│   │       ├── shop.ts
│   │       └── notifications.ts
│   └── services/                   # Business logic layer
│       ├── wave.service.ts         # Wave/reaction logic
│       ├── match.service.ts        # Compatibility calculation
│       ├── shop.service.ts         # Purchase + inventory
│       ├── notification.service.ts
│       └── audio.service.ts        # R2 upload + stream URLs
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client (singleton)
│   │   └── server.ts               # Server client (per-request)
│   ├── redis.ts                    # Upstash client singleton
│   ├── r2.ts                       # R2 client + presigned URL helpers
│   ├── ratelimit.ts                # Upstash Ratelimit configs
│   └── trpc/
│       ├── client.tsx              # TRPCReactProvider
│       └── server.ts               # Server-side caller
│
├── hooks/
│   ├── useVirtualFeed.ts           # Feed virtualization
│   ├── useRealtimeNow.ts           # Subscribe to now updates
│   ├── useRealtimeChat.ts
│   ├── useIntersectionObserver.ts
│   └── useMediaSession.ts          # Background audio
│
├── stores/
│   ├── player.store.ts             # Audio player
│   ├── auth.store.ts               # Current user
│   └── ui.store.ts                 # Modals, sheets
│
└── types/
    ├── db.ts                       # Drizzle inferred types
    ├── api.ts                      # tRPC output types
    └── domain.ts                   # Enriched domain types
```

---

## DATABASE SCHEMA (Drizzle)

```ts
// schema.ts — full schema

import {
  pgTable, uuid, varchar, text, integer, boolean,
  timestamp, pgEnum, jsonb, primaryKey, index
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const avatarTypeEnum = pgEnum('avatar_type', ['constructor', 'photo'])
export const bannerTypeEnum = pgEnum('banner_type', ['color', 'pattern', 'animated'])
export const voopMediaTypeEnum = pgEnum('voop_media_type', ['image', 'gif', 'meme'])
export const itemTypeEnum = pgEnum('item_type', [
  'effect', 'ring', 'banner', 'nameplate', 'badge', 'reaction_pack'
])
export const chatTypeEnum = pgEnum('chat_type', ['direct', 'group'])
export const notifTypeEnum = pgEnum('notif_type', [
  'wave', 'card_reaction', 'follow', 'reply', 'revoop', 'match', 'mystery_drop'
])
export const acquiredViaEnum = pgEnum('acquired_via', [
  'purchase', 'earned', 'gifted', 'seasonal_reward'
])
export const subscriptionTierEnum = pgEnum('subscription_tier', ['plus', 'pro'])
export const trackSourceEnum = pgEnum('track_source', ['upload', 'chat', 'voop'])

// Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 30 }).notNull().unique(),
  displayName: varchar('display_name', { length: 50 }).notNull(),
  bio: varchar('bio', { length: 100 }),
  pinnedThought: varchar('pinned_thought', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, t => ({
  usernameIdx: index('username_idx').on(t.username),
}))

// Profile customization
export const profileCustomization = pgTable('profile_customization', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  bannerType: bannerTypeEnum('banner_type').notNull().default('color'),
  bannerValue: jsonb('banner_value').notNull().default({ color: '#1A0D2E' }),
  avatarType: avatarTypeEnum('avatar_type').notNull().default('constructor'),
  avatarData: jsonb('avatar_data').notNull().default({}),
  avatarRingId: varchar('avatar_ring_id', { length: 100 }),
  profileEffectId: varchar('profile_effect_id', { length: 100 }),
  nameplateId: varchar('nameplate_id', { length: 100 }),
  nicknameColor: varchar('nickname_color', { length: 20 }),
  nicknameGradient: boolean('nickname_gradient').default(false),
  themePrimary: varchar('theme_primary', { length: 7 }).default('#0A0A0F'),
  themeAccent: varchar('theme_accent', { length: 7 }).default('#7B3AED'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Now block (СЕЙЧАС — no label in UI, just the block)
export const userNow = pgTable('user_now', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  // Mood: 0 = not set, 1–10 = scale
  moodValue: integer('mood_value'),
  // Quote/status — shown without label
  thought: varchar('thought', { length: 80 }),
  // Track — artist + title only, no "anthem" label in UI
  trackTitle: varchar('track_title', { length: 100 }),
  trackArtist: varchar('track_artist', { length: 100 }),
  trackFileUrl: varchar('track_file_url', { length: 500 }),
  // Optional fields
  watchingTitle: varchar('watching_title', { length: 100 }),
  watchingTmdbId: varchar('watching_tmdb_id', { length: 20 }),
  vibeTag: varchar('vibe_tag', { length: 30 }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Now history — personal diary
export const nowHistory = pgTable('now_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  moodValue: integer('mood_value'),
  thought: varchar('thought', { length: 80 }),
  trackTitle: varchar('track_title', { length: 100 }),
  trackArtist: varchar('track_artist', { length: 100 }),
  vibeTag: varchar('vibe_tag', { length: 30 }),
  capturedAt: timestamp('captured_at').notNull().defaultNow(),
}, t => ({
  userIdIdx: index('now_history_user_idx').on(t.userId),
  capturedAtIdx: index('now_history_time_idx').on(t.capturedAt),
}))

// Voops (posts)
export const voops = pgTable('voops', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  text: varchar('text', { length: 280 }),
  // Snapshot of now block at time of posting
  stateSnapshot: jsonb('state_snapshot'),
  mediaUrl: varchar('media_url', { length: 500 }),
  mediaType: voopMediaTypeEnum('media_type'),
  isRevoop: boolean('is_revoop').default(false),
  originalVoopId: uuid('original_voop_id').references((): any => voops.id),
  revoopComment: varchar('revoop_comment', { length: 280 }),
  waveCount: integer('wave_count').notNull().default(0),
  replyCount: integer('reply_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, t => ({
  authorIdx: index('voops_author_idx').on(t.authorId),
  createdAtIdx: index('voops_created_at_idx').on(t.createdAt),
}))

// Waves (post reactions — the 〜 button)
export const waves = pgTable('waves', {
  voopId: uuid('voop_id').notNull().references(() => voops.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, t => ({
  pk: primaryKey({ columns: [t.voopId, t.userId] }),
}))

// Card reactions (emoji on profile card)
export const cardReactions = pgTable('card_reactions', {
  profileUserId: uuid('profile_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reactorUserId: uuid('reactor_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji: varchar('emoji', { length: 10 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, t => ({
  pk: primaryKey({ columns: [t.profileUserId, t.reactorUserId, t.emoji] }),
}))

// Follows
export const follows = pgTable('follows', {
  followerId: uuid('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: uuid('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, t => ({
  pk: primaryKey({ columns: [t.followerId, t.followingId] }),
  followerIdx: index('follows_follower_idx').on(t.followerId),
  followingIdx: index('follows_following_idx').on(t.followingId),
}))

// Profile views (last 10 visible to owner)
export const profileViews = pgTable('profile_views', {
  profileUserId: uuid('profile_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  viewerUserId: uuid('viewer_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at').notNull().defaultNow(),
}, t => ({
  pk: primaryKey({ columns: [t.profileUserId, t.viewerUserId] }),
}))

// Playlist tracks
export const playlistTracks = pgTable('playlist_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 100 }).notNull(),
  artist: varchar('artist', { length: 100 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  coverUrl: varchar('cover_url', { length: 500 }),
  durationSeconds: integer('duration_seconds'),
  addedAt: timestamp('added_at').notNull().defaultNow(),
  addedFrom: trackSourceEnum('added_from').notNull().default('upload'),
}, t => ({
  userIdx: index('playlist_user_idx').on(t.userId),
}))

// Anthem (profile music — no label in UI)
export const userAnthem = pgTable('user_anthem', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  trackId: uuid('track_id').notNull().references(() => playlistTracks.id),
})

// Chats
export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: chatTypeEnum('type').notNull(),
  name: varchar('name', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const chatMembers = pgTable('chat_members', {
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, t => ({
  pk: primaryKey({ columns: [t.chatId, t.userId] }),
}))

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  text: varchar('text', { length: 1000 }),
  mediaUrl: varchar('media_url', { length: 500 }),
  sharedVoopId: uuid('shared_voop_id').references(() => voops.id),
  sharedTrackId: uuid('shared_track_id').references(() => playlistTracks.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  readAt: timestamp('read_at'),
}, t => ({
  chatIdx: index('messages_chat_idx').on(t.chatId),
  createdAtIdx: index('messages_time_idx').on(t.createdAt),
}))

// Shop items
export const shopItems = pgTable('shop_items', {
  id: varchar('id', { length: 100 }).primaryKey(),
  seasonId: varchar('season_id', { length: 50 }),
  type: itemTypeEnum('type').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  priceRub: integer('price_rub').notNull(),
  apngUrl: varchar('apng_url', { length: 500 }),
  previewUrl: varchar('preview_url', { length: 500 }),
  isLimited: boolean('is_limited').default(false),
  stock: integer('stock'),
  soldCount: integer('sold_count').notNull().default(0),
  requiresSubscription: subscriptionTierEnum('requires_subscription'),
})

// User inventory
export const userInventory = pgTable('user_inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: varchar('item_id', { length: 100 }).notNull().references(() => shopItems.id),
  acquiredAt: timestamp('acquired_at').notNull().defaultNow(),
  acquiredVia: acquiredViaEnum('acquired_via').notNull(),
}, t => ({
  userIdx: index('inventory_user_idx').on(t.userId),
  uniqueItem: index('inventory_unique').on(t.userId, t.itemId),
}))

// User badges
export const userBadges = pgTable('user_badges', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: varchar('badge_id', { length: 100 }).notNull(),
  earnedAt: timestamp('earned_at').notNull().defaultNow(),
}, t => ({
  pk: primaryKey({ columns: [t.userId, t.badgeId] }),
}))

// Subscriptions
export const subscriptions = pgTable('subscriptions', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  tier: subscriptionTierEnum('tier').notNull(),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  paymentProvider: varchar('payment_provider', { length: 50 }).notNull(),
  externalId: varchar('external_id', { length: 200 }).notNull(),
})

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notifTypeEnum('type').notNull(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'cascade' }),
  referenceId: uuid('reference_id'),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, t => ({
  userUnreadIdx: index('notif_user_unread_idx').on(t.userId, t.read),
}))
```

FEATURE SPECIFICATIONS
1. PROFILE CARD

Purpose: живая карточка профиля — главный визуальный объект

Layers (bottom to top):

    Theme background color
    Banner (color / pattern / animated WebP)
    Avatar (SVG constructor or photo)
    Avatar ring decoration (CSS or Lottie)
    Profile effect (Lottie, only when card is open)
    UI content (name, badges, buttons, state)

Mobile layout:

    Banner: 110px height, full width
    Avatar: 72px, overlaps banner by 36px, left-aligned
    Badges: right-aligned, same row as avatar
    Nameplate + username: below avatar
    Bio: below nameplate
    Buttons: Подписаться + Написать
    СЕЙЧАС block
    Card reactions (emoji row)
    Stats
    Tabs (Вупы / Ответы / Медиа)
    Posts list

Sticky header on scroll:

    Triggers when СЕЙЧАС block scrolls out of view
    Height: 52px
    Shows: avatar 32px + name + @username + mini stats
    Background: #0A0A0F with backdrop-blur

Desktop layout:

    Modal: max-width 900px, two columns
    Left column: 320px, sticky, full card
    Right column: flex, scrollable posts
    Triggered by clicking avatar anywhere in app

Animations:

    Avatar ring: CSS only (conic-gradient rotation)
    Profile effect: Lottie, plays only when modal/page is open
    Pause all when tab is hidden (visibilitychange API)
    Pause when not in viewport (IntersectionObserver)

2. FEED (ЛЕНТА)

Purpose: Twitter-like chronological feed

Voop types:

    text only (max 280 chars)
    text + media (image/gif/meme)
    text + state attachment (mood/thought/track)
    revoop (repost with optional comment)

Voop card anatomy:

    Avatar (32px in feed) with ring if equipped
    Username + display name + nameplate color
    Subscription badge (✦ or ◈) next to name
    Timestamp
    Post text
    State attachment (if any): pill with light purple bg
    Media (if any)
    Actions: 〜 wave count / 💬 reply count / ↗ revoop

Mini profile popup:

    Triggered by clicking avatar in feed
    Shows: avatar + name + СЕЙЧАС snapshot + follow/message buttons
    No page navigation, overlay only

Pagination:

    Cursor-based pagination, not page-based
    Load 20 voops at a time
    Infinite scroll via IntersectionObserver

3. СЕЙЧАС BLOCK

Purpose: live status — current state of user

Fields (max 3 active, 5 with Voople+):

    🌡 mood: int 1-10 + label
    💭 thought: varchar(80)
    🎵 track: from personal playlist
    📺 watching: from TMDB search
    🌀 vibe: tag from library of 60

Update behavior:

    Silently updates card (no feed post)
    Optional: "Post to feed" button creates voop with state attachment

State history:

    Every update saves to now_history
    Visible only to owner
    Free: last 90 days
    Voople+: forever

4. MUSIC PLAYER

Purpose: personal playlist + anthem

Playlist management:

    Upload audio files (mp3, flac, m4a, max 20mb per file)
    Add from chat (someone sends a track → + to playlist)
    Add from feed (track in a voop → + to playlist)
    Max tracks: 200 (free), unlimited (Voople+)

Anthem:

    One track selected as profile anthem
    Shown on profile card always
    Plays when someone opens profile (opt-in setting)

Player UI:

    Mini player: sticky bottom bar above nav
    Shows: track name + artist + progress bar
    Controls: prev / play-pause / next / shuffle
    Expands to full player on tap
    Plays in background (Media Session API)
    Persists across navigation (Zustand store)

Storage:

    Files stored on Cloudflare R2
    URL stored in playlist_tracks.file_url
    Served via Cloudflare CDN
    Audio streamed, not downloaded fully

5. CUSTOMIZATION SYSTEM

Editor flow:

    Profile → Edit card button
    Full screen editor with live preview at top
    Category tabs: Эффект / Баннер / Аватар / Рамка / Имя / Тема
    Items shown as grid, locked items visible with price
    Tap locked item → purchase sheet
    Changes applied to live preview instantly
    Save button → saves to profile_customization

Avatar constructor (SVG layers):

    Each layer is an SVG group
    Layers: body / skin / eyes / hair / clothes / accessories / background
    Rendered client-side as inline SVG
    Exported as PNG for sharing via @vercel/og

Lottie effects:

    JSON files hosted on Cloudflare R2/CDN
    Loaded lazily when editor opens or card opens
    Library: lottie-web (renderer: 'svg')
    Max concurrent animations: 1 effect + 1 ring

6. CHAT (МЕССЕНДЖЕР)

Features:

    Direct messages
    Group chats (max 50)
    Message types: text / image / audio file / shared voop / shared profile card
    Reactions on messages (emoji, long press)
    Context card in chat header: recipient's current СЕЙЧАС

Realtime:

    Supabase Realtime for new messages
    Optimistic UI: message appears immediately, confirms after

Audio messages / music:

    Track shared from playlist → inline player in chat bubble
    Recipient can add to their playlist

7. SHOP

Mystery Drop:

    Random item from current season pool
    Weight-based: common items higher weight, rare items lower
    Some items: limited stock (e.g. 300 total)
    Shows rarity after opening

Seasonal Bundle:

    Fixed set of 5-6 items
    Available only during active season
    Removed exactly when season ends (no grace period)

Direct purchases:

    Individual items from shop grid
    Limited items show stock counter

Subscriptions (Voople+ / Pro):

    Monthly recurring via YooKassa
    Webhooks update subscriptions table
    Features gated by subscription tier check


---

## NOW BLOCK SPEC

**No label. Three elements only.**

```
[mood slider]
[quote / status text]
[Artist — Title]
```

### Mood slider

```
Slider component, full width.
Thumb: emoji that changes based on value.
Track: fills left of thumb with accent color.

Value → Emoji mapping:
1–2   →  😴
3–4   →  😔
5     →  😐
6–7   →  🙂
8–9   →  😊
10    →  🔥

No numeric value shown publicly.
Value stored as integer 1–10 in DB.
In history: exact number saved for personal analytics.

Interaction: drag or tap to set.
On release: debounced 500ms save to server.
Optimistic update immediately.
```

```tsx
// MoodSlider.tsx
const MOOD_EMOJIS: Record<number, string> = {
  1: '😴', 2: '😴',
  3: '😔', 4: '😔',
  5: '😐',
  6: '🙂', 7: '🙂',
  8: '😊', 9: '😊',
  10: '🔥',
}

// Thumb is the emoji, rendered as absolute positioned element
// Track fill: accent color from profile theme
// No labels, no numbers visible
```

### Quote / status

```
No field label.
No "мысль:" prefix.
Just the text, italic, secondary color.
Max 80 chars.
Empty state: nothing shown (block collapses, not placeholder)
```

### Music line

```
No "гимн" label.
No "сейчас слушает" label.
Format: "Artist — Title"
Secondary text color.
If track playing: subtle ▶ indicator left of artist name (optional)
Empty state: nothing shown
```

### Block empty state behavior

```
All three fields empty → block not rendered at all
One field set → only that field shown
Two fields → two lines
Three fields → three lines

No section header.
No "СЕЙЧАС" label.
No border or card wrapper that would look empty.
```

---

## CODE STANDARDS

### Component constraints

```
Max lines per file:     150
Max props per component: 8
Max nesting depth:       4
Max hook dependencies:   6 (useEffect/useCallback/useMemo)
```

When a component exceeds 150 lines — split immediately, no exceptions.
Split strategy: extract inner blocks into sub-components, not just move code.

### State architecture

```
Server state:   tRPC (React Query underneath)
Global UI:      Zustand (3 stores max: auth, player, ui)
Local UI:       useState / useReducer
Forms:          React Hook Form + Zod
URL state:      useSearchParams / nuqs
```

Rule: if state is needed in more than one component → lift it. 
If lifting means prop drilling past 2 levels → Zustand or React Context (for tightly scoped trees only).

Never use Context for frequently updating state. Context re-renders all consumers.

### Optimistic updates — required for all user actions

```ts
// Every wave/follow/reaction uses optimistic update
const utils = trpc.useUtils()

const waveMutation = trpc.voop.wave.useMutation({
  onMutate: async ({ voopId }) => {
    await utils.feed.getInfinite.cancel()
    const prev = utils.feed.getInfinite.getData()
    
    utils.feed.getInfinite.setData(undefined, old => 
      old ? updateWaveCount(old, voopId, +1) : old
    )
    
    return { prev }
  },
  onError: (_, __, ctx) => {
    utils.feed.getInfinite.setData(undefined, ctx?.prev)
  },
  onSettled: () => {
    utils.feed.getInfinite.invalidate()
  },
})
```

### Cursor pagination — standard implementation

```ts
// All list queries use cursor pagination
input: z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().min(1).max(50).default(20),
})

// Query pattern
const items = await db.query.voops.findMany({
  where: cursor 
    ? and(eq(voops.authorId, userId), lt(voops.id, cursor))
    : eq(voops.authorId, userId),
  limit: input.limit + 1,  // fetch one extra to know if more exist
  orderBy: desc(voops.createdAt),
})

const hasMore = items.length > input.limit
const data = hasMore ? items.slice(0, -1) : items

return {
  items: data,
  nextCursor: hasMore ? data[data.length - 1].id : undefined,
}
```

### Feed virtualization — required

```ts
// useVirtualFeed.ts
import { useVirtualizer } from '@tanstack/react-virtual'

// Never render more than what's visible
// Estimated item size: 120px (short post) to 400px (with media)
// overscan: 5 items above and below viewport
```

### Rate limiting — all mutations

```ts
// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

export const rateLimits = {
  // Voops: 30 per hour
  createVoop: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'),
  }),
  // Waves: 100 per 10 minutes
  wave: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '10 m'),
  }),
  // Now updates: 20 per hour
  updateNow: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
  }),
  // Audio upload: 10 per day
  uploadTrack: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '24 h'),
  }),
}
```

Usage in tRPC procedure:
```ts
const { success } = await rateLimits.createVoop.limit(ctx.user.id)
if (!success) throw new TRPCError({ code: 'TOO_MANY_REQUESTS' })
```

### Services layer — business logic isolation

All business logic lives in `server/services/`. tRPC routers orchestrate, services execute.

```ts
// server/services/wave.service.ts
export class WaveService {
  constructor(
    private db: Database,
    private redis: Redis,
    private notificationService: NotificationService,
  ) {}

  async toggleWave(voopId: string, userId: string): Promise<{
    waved: boolean
    newCount: number
  }> {
    // 1. Check existing wave
    // 2. Insert or delete
    // 3. Update counter (atomic)
    // 4. Queue notification (don't await)
    // 5. Invalidate cache
    // 6. Return result
  }
}
```

### APNG handling

```ts
// APNG files served from Cloudflare R2 via CDN
// Rendered as <img> tags — browser animates natively
// Rules:

// 1. Never load APNG in feed — only on profile card open
// 2. Pause via CSS when tab hidden
// 3. Lazy load with IntersectionObserver
// 4. Preload on hover (desktop) or on card open intent

// ProfileEffect.tsx
export function ProfileEffect({ effectUrl }: { effectUrl: string }) {
  const ref = useRef<HTMLImageElement>(null)
  
  // Pause when tab hidden
  useEffect(() => {
    const handler = () => {
      if (!ref.current) return
      ref.current.style.animationPlayState = 
        document.hidden ? 'paused' : 'running'
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  return (
    <img
      ref={ref}
      src={effectUrl}
      alt=""
      aria-hidden
      loading="lazy"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
        objectFit: 'cover',
      }}
    />
  )
}
```

### Audio streaming

```ts
// server/services/audio.service.ts
// Never serve audio directly — always presigned URLs or stream proxy

async getStreamUrl(trackId: string, userId: string): Promise<string> {
  // Verify ownership
  const track = await this.db.query.playlistTracks.findFirst({
    where: and(
      eq(playlistTracks.id, trackId),
      eq(playlistTracks.userId, userId)
    ),
  })
  if (!track) throw new TRPCError({ code: 'FORBIDDEN' })
  
  // Return presigned URL valid for 1 hour
  return this.r2.getSignedUrl(track.fileUrl, 3600)
}

// Upload: validate on server before storing
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/flac', 'audio/x-m4a', 'audio/mp4']
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20mb
```

### Error handling pattern

```ts
// Two error boundaries: page-level and component-level
// Page-level: error.tsx in each route segment
// Component-level: for widgets that shouldn't crash the page

// tRPC errors — always use TRPCError with specific codes
throw new TRPCError({
  code: 'FORBIDDEN',
  message: 'You do not own this profile',
})

// Client-side: React Query error states handled in hook, 
// not in component
const { data, error, isLoading } = trpc.profile.get.useQuery(...)

// Component receives pre-processed states, not raw error objects
```

### Authorization — middleware pattern

```ts
// server/trpc/init.ts
const enforceOwnership = t.middleware(async ({ ctx, next, rawInput }) => {
  // All protected procedures automatically have ctx.user
  // Ownership checks in each procedure, not middleware
  // Reason: middleware doesn't know what resource is being accessed
  return next({ ctx: { user: ctx.user } })
})

export const protectedProcedure = t.procedure.use(enforceOwnership)
```

---

## ANTIPATTERNS

```
❌ Fetching in useEffect
❌ any type — use unknown + narrowing
❌ Storing derived state (compute in render or useMemo)
❌ Prop drilling past 2 levels
❌ useContext for high-frequency state updates
❌ Mutating objects in Zustand directly (use immer or spread)
❌ Multiple Zustand stores for related state
❌ Untyped tRPC procedure outputs
❌ Blocking response for non-critical side effects (notifications, cache)
❌ Loading full audio file — always stream with range requests
❌ Playing APNG in feed (performance)
❌ N+1 DB queries — use joins or dataloader pattern
❌ Storing auth tokens in localStorage — Supabase handles this
❌ Client components for static content
❌ Missing loading skeletons (use skeleton, not spinner)
❌ Missing empty states
❌ Missing error states with retry
❌ console.log in committed code
❌ TODO/FIXME in committed code
❌ Hardcoded strings — use constants file for repeated values
❌ Direct DOM manipulation — React handles the DOM
❌ Bypassing rate limits with service role key
```

---

## ENV VARIABLES

```bash
# .env.example

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
NEXT_PUBLIC_R2_PUBLIC_URL=

TMDB_API_KEY=

YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_WEBHOOK_SECRET=

NEXT_PUBLIC_APP_URL=
```

---
