# Comments And Reposts

Следующий social loop после стабильных posts/likes/follows/realtime.

## Current Status

Implemented baseline:

- `drizzle/07-comments-reposts.sql`
- `post_comments` with RLS, realtime, soft delete, and `(post_id, created_at)` index
- `posts.repost_count` and `posts.original_post_id` FK/index
- `create_post_comment`, `delete_post_comment`, `toggle_repost` SQL functions
- tRPC: `post.listComments`, `post.createComment`, `post.deleteComment`, `post.repost`, `post.quoteRepost`
- Feed card inline comments, plain repost toggle, quote repost composer and nested repost previews

Still planned:

- none for baseline comments/reposts loop

Implemented additionally:

- dedicated `/post/[postId]` detail route with comments open by default
- notifications for comments (`reply`) and reposts (`repost`) with realtime inbox updates

## Comments

### Product Behavior

- Comment = reply under a post.
- Max text length: 280 chars.
- One-level replies for first release. Nested threads are out of scope.
- Comments appear under post detail screen and increment `posts.reply_count`.
- Author can delete own comment.
- Post author receives notification on new comment, except self-comment.
- Post author receives notification on plain or quote repost, except self-repost.

### Data Model

Implemented table:

```ts
post_comments {
  id uuid primary key
  post_id uuid references posts(id) on delete cascade
  author_id uuid references users(id) on delete cascade
  text varchar(280) not null
  created_at timestamp default now()
  deleted_at timestamp null
}
```

Indexes:

- `(post_id, created_at)`
- `(author_id, created_at)`

### API

- `post.listComments({ postId })`
- `post.createComment({ postId, text })`
- `post.deleteComment({ commentId })`

### UI

- Feed card can expand inline comments.
- `/post/[postId]` shows the full post with comments open by default.

## Reposts

### Product Behavior

- Repost without comment boosts the exact target post into feeds.
- Quote repost creates a new post with `repostComment`.
- Plain repost can be toggled off by the same user.
- Only one plain repost per `(user, targetPost)`.
- Repost of repost points to the immediate target post, not root. This keeps counters local: reposting a repost increments the reposted post, not the whole chain.

### Existing Schema

`posts` already has:

```ts
isRepost boolean
originalPostId uuid
repostComment varchar(280)
```

Implemented:

- Add FK from `posts.original_post_id` to `posts.id`.
- Add index on `original_post_id`.
- Atomic plain/quote repost via `toggle_repost(postId, actorId, comment?)`.

### API

- `post.repost({ postId })`
- `post.quoteRepost({ postId, comment })`
- `post.repost.listByPost({ postId, cursor, limit })`

### UI

- `PostCard` has a repost panel.
- Plain repost is optimistic.
- Quote repost uses inline textarea.
- Feed card for repost shows the repost author, optional quote text, and nested target preview.

## Realtime

- New comments should update comment count on visible post cards through tRPC cache patch or realtime trigger.
- New reposts should appear in `/feed` via existing `posts` realtime subscription.
- No polling for comments/reposts as normal path.

## Implementation Order

1. DB migration for comments table, repost FK/indexes.
2. `src/server/data/comments-rest.ts`, `src/server/data/reposts-rest.ts`.
3. tRPC procedures with explicit Zod input and output types.
4. Post detail route and comments UI.
5. Repost actions in feed card.
6. Notifications for comments/reposts.
7. Realtime cache patching for visible cards.

## Current Dependencies

Before implementing comments/reposts UI, keep these live counters working:

- `posts.view_count` through `post.view`.
- `posts.reply_count` after comment creation/deletion.
- `posts.repost_count` or derived repost count after repost implementation.
- `useRealtimeFeed` must patch visible post counters from `posts` UPDATE events.
