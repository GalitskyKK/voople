-- Admin shop: DB-first каталог — колонка `kind` и полный набор полей.
-- Запустить в Supabase SQL Editor перед использованием /admin/assets.

ALTER TABLE public.shop_items
  ADD COLUMN IF NOT EXISTS kind varchar(50),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS price_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS asset_folder varchar(100),
  ADD COLUMN IF NOT EXISTS asset_id varchar(200),
  ADD COLUMN IF NOT EXISTS equip_slot varchar(50),
  ADD COLUMN IF NOT EXISTS equip_value varchar(200);

-- Backfill kind из legacy type + id (до миграции на админку).
UPDATE public.shop_items SET kind = 'animated_avatar'
  WHERE kind IS NULL AND id LIKE 'animated-%';

UPDATE public.shop_items SET kind = 'nickname_style'
  WHERE kind IS NULL AND type = 'nameplate';

UPDATE public.shop_items SET kind = type::text
  WHERE kind IS NULL;

-- После seed из catalog.ts можно прогнать npm run shop:seed:sql — upsert обновит kind.

CREATE INDEX IF NOT EXISTS shop_items_kind_idx ON public.shop_items (kind);
CREATE INDEX IF NOT EXISTS shop_items_sort_idx ON public.shop_items (sort_order);
