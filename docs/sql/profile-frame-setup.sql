-- Card frame (рамка вокруг всей карточки) + режим основы — одноразовая миграция.
-- Рамки заменяют эффекты профиля (profile_effect_id больше не рендерится, но данные не удаляются).
-- Запускай в Supabase SQL Editor.

-- 1. Колонки в profile_customization
ALTER TABLE public.profile_customization
  ADD COLUMN IF NOT EXISTS profile_frame_id varchar(100),
  ADD COLUMN IF NOT EXISTS frame_color varchar(20),
  ADD COLUMN IF NOT EXISTS card_base_mode varchar(20);

-- 2. Enum для shop_items.type (рамка как отдельный вид товара) — Фаза 2, когда появятся item'ы.
-- ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'frame';

-- 3. (Опционально) Быстрый equip для своего аккаунта после миграции:
-- UPDATE public.profile_customization
-- SET profile_frame_id = 'frame-gold-glow', updated_at = now()
-- WHERE user_id = '<your-user-uuid>';

-- 4. (Опционально) Кастомный цвет рамки (Voople+):
-- UPDATE public.profile_customization
-- SET profile_frame_id = 'frame-custom', frame_color = '#f9a8d4', updated_at = now()
-- WHERE user_id = '<your-user-uuid>';
