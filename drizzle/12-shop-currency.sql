-- Shop currency, payments prep, customization equip columns, catalog seed.
-- Apply manually in Supabase SQL editor.
--
-- IMPORTANT: run drizzle/12-shop-currency-enums.sql FIRST (separate Run),
-- then run this file. Enum labels must commit before INSERT uses them.

ALTER TABLE public.shop_items
  ADD COLUMN IF NOT EXISTS price_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description varchar(300),
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS asset_folder varchar(50),
  ADD COLUMN IF NOT EXISTS asset_id varchar(100),
  ADD COLUMN IF NOT EXISTS equip_slot varchar(40),
  ADD COLUMN IF NOT EXISTS equip_value varchar(100);

ALTER TABLE public.profile_customization
  ADD COLUMN IF NOT EXISTS avatar_decoration_id varchar(100),
  ADD COLUMN IF NOT EXISTS feed_card_style_id varchar(100),
  ADD COLUMN IF NOT EXISTS animated_avatar_id varchar(100),
  ADD COLUMN IF NOT EXISTS app_theme_id varchar(30);

CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance_coins integer NOT NULL DEFAULT 0 CHECK (balance_coins >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  kind varchar(30) NOT NULL,
  reference_type varchar(30),
  reference_id varchar(100),
  note varchar(200),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_user_idx ON public.wallet_transactions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind varchar(30) NOT NULL,
  amount_rub integer NOT NULL CHECK (amount_rub > 0),
  status varchar(20) NOT NULL DEFAULT 'pending',
  provider varchar(30) NOT NULL DEFAULT 'yookassa',
  external_id varchar(200),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_intents_user_idx ON public.payment_intents (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS payment_intents_external_uidx
  ON public.payment_intents (provider, external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_wallets_select_own" ON public.user_wallets;
CREATE POLICY "user_wallets_select_own"
  ON public.user_wallets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wallet_transactions_select_own" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_select_own"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- payment_intents: server-only writes; users may read own pending checkout state
DROP POLICY IF EXISTS "payment_intents_select_own" ON public.payment_intents;
CREATE POLICY "payment_intents_select_own"
  ON public.payment_intents FOR SELECT
  USING (auth.uid() = user_id);

-- Seed: keep in sync with src/lib/shop/catalog.ts (see drizzle/13-shop-catalog-sync.sql)
INSERT INTO public.shop_items (
  id, season_id, type, name, description, price_rub, price_coins, is_free,
  preview_url, sort_order, asset_folder, asset_id, equip_slot, equip_value
) VALUES
  ('banner-minti', 'launch', 'banner', 'Minti', 'Мягкий баннер с градиентом для карточки профиля.', 49, 120, true, NULL, 10, 'banners', 'minti', 'banner', 'minti'),
  ('effect-ladybugs', 'launch', 'effect', 'Ladybugs', 'Анимированные божьи коровки поверх профиля.', 79, 180, true, NULL, 20, 'effects', 'ladybugs', 'profile_effect_id', 'ladybugs'),
  ('decoration-sparkle', 'launch', 'decoration', 'Sparkle', 'Сияние вокруг аватара.', 69, 150, true, NULL, 30, 'decorations', 'sparkle', 'avatar_decoration_id', 'sparkle'),
  ('feed-sakura', 'launch', 'feed_card', 'Sakura', 'Фон полоски поста в ленте.', 59, 100, true, NULL, 40, 'feed-cards', 'sakura', 'feed_card_style_id', 'sakura'),
  ('animated-minti', 'launch', 'effect', 'Minti APNG', 'Анимированный аватар вместо буквы.', 99, 220, true, NULL, 50, 'animated', 'minti.apng', 'animated_avatar_id', 'minti')
ON CONFLICT (id) DO UPDATE SET
  season_id = EXCLUDED.season_id,
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_rub = EXCLUDED.price_rub,
  price_coins = EXCLUDED.price_coins,
  is_free = EXCLUDED.is_free,
  sort_order = EXCLUDED.sort_order,
  asset_folder = EXCLUDED.asset_folder,
  asset_id = EXCLUDED.asset_id,
  equip_slot = EXCLUDED.equip_slot,
  equip_value = EXCLUDED.equip_value;
