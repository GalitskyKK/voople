# Терминология

Везде используются **привычные** имена — в UI, коде и БД.

| Сущность | UI (RU) | Код / БД |
|----------|---------|----------|
| Публикация | Пост / Посты | `post`, `posts`, `PostCard` |
| Реакция | Нравится | `like`, `likes`, `like_count` |
| Репост | Поделиться / Репост | `repost`, `is_repost` |
| Комментарий | Комментарий / Ответы | `reply`, `reply_count` |
| Лента | Лента | `feed` |
| Статус | без заголовка | `user_status`, `ProfileStatusBlock` |
| Магазин | Магазин | `shop`, `/shop` |
| Voops | voops (внутренняя валюта) | `user_wallets.balance_coins` |
| Кастомизация | оформление профиля | `profile_customization`, `user_inventory` |

**Не использовать:** `voop`, `wave`, `revoop`, `VoopCard`.

Строки UI: `src/lib/constants/copy.ts`.
