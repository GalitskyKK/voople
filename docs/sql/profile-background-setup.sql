-- Profile card video background — одноразовая миграция + каталог.
-- Запускай в Supabase SQL Editor по порядку.

-- 1. Enum для shop_items.type
ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'profile_background';

-- 2. Колонка equip в profile_customization
ALTER TABLE public.profile_customization
  ADD COLUMN IF NOT EXISTS profile_background_id varchar(100);

-- 3. Каталог — см. drizzle/shop-catalog-upsert.sql (или npm run shop:seed:sql локально).
--    Предмет: id = bg-blue-flowers, equip_value = background_blue_flowers

-- 4. (Опционально) Быстрый equip для своего аккаунта после claim в /shop:
-- UPDATE public.profile_customization
-- SET profile_background_id = 'background_blue_flowers', updated_at = now()
-- WHERE user_id = '<your-user-uuid>';
