-- Canonical interests shared by profiles, communities and discovery ranking.

CREATE TABLE IF NOT EXISTS public.interest_categories (
  slug varchar(32) PRIMARY KEY,
  name varchar(50) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.interests (
  slug varchar(48) PRIMARY KEY,
  category_slug varchar(32) NOT NULL REFERENCES public.interest_categories(slug) ON DELETE RESTRICT,
  name varchar(60) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.user_interests (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  interest_slug varchar(48) NOT NULL REFERENCES public.interests(slug) ON DELETE CASCADE,
  selected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, interest_slug)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.group_discovery_profiles (
  chat_id uuid PRIMARY KEY REFERENCES public.chats(id) ON DELETE CASCADE,
  primary_category_slug varchar(32) REFERENCES public.interest_categories(slug) ON DELETE SET NULL,
  language varchar(10) NOT NULL DEFAULT 'ru',
  region varchar(64),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.group_interests (
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  interest_slug varchar(48) NOT NULL REFERENCES public.interests(slug) ON DELETE CASCADE,
  selected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, interest_slug)
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS user_interests_interest_idx ON public.user_interests(interest_slug, user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS group_interests_interest_idx ON public.group_interests(interest_slug, chat_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS group_discovery_category_idx ON public.group_discovery_profiles(primary_category_slug, language);
--> statement-breakpoint

INSERT INTO public.interest_categories(slug, name, sort_order) VALUES
  ('games', 'Игры', 10), ('technology', 'Технологии', 20),
  ('creativity', 'Творчество', 30), ('music', 'Музыка', 40),
  ('cinema', 'Кино и сериалы', 50), ('anime', 'Аниме', 60),
  ('lifestyle', 'Образ жизни', 70)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;
--> statement-breakpoint

INSERT INTO public.interests(slug, category_slug, name, sort_order) VALUES
  ('valorant', 'games', 'Valorant', 10), ('minecraft', 'games', 'Minecraft', 20),
  ('deep-rock-galactic', 'games', 'Deep Rock Galactic', 30), ('indie-games', 'games', 'Инди-игры', 40),
  ('programming', 'technology', 'Программирование', 10), ('web-development', 'technology', 'Web-разработка', 20),
  ('linux', 'technology', 'Linux', 30), ('artificial-intelligence', 'technology', 'Искусственный интеллект', 40),
  ('ui-ux', 'creativity', 'UI/UX', 10), ('blender', 'creativity', 'Blender', 20),
  ('photography', 'creativity', 'Фотография', 30), ('digital-art', 'creativity', 'Цифровое искусство', 40),
  ('electronic-music', 'music', 'Электронная музыка', 10), ('rock', 'music', 'Рок', 20),
  ('hip-hop', 'music', 'Хип-хоп', 30), ('music-production', 'music', 'Создание музыки', 40),
  ('science-fiction', 'cinema', 'Научная фантастика', 10), ('animation', 'cinema', 'Анимация', 20),
  ('documentaries', 'cinema', 'Документальное кино', 30), ('tv-series', 'cinema', 'Сериалы', 40),
  ('shonen', 'anime', 'Сёнэн', 10), ('seinen', 'anime', 'Сэйнэн', 20),
  ('manga', 'anime', 'Манга', 30), ('cosplay', 'anime', 'Косплей', 40),
  ('fitness', 'lifestyle', 'Фитнес', 10), ('travel', 'lifestyle', 'Путешествия', 20),
  ('cooking', 'lifestyle', 'Кулинария', 30), ('board-games', 'lifestyle', 'Настольные игры', 40)
ON CONFLICT (slug) DO UPDATE SET category_slug = EXCLUDED.category_slug, name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;
--> statement-breakpoint

ALTER TABLE public.interest_categories ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.group_discovery_profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.group_interests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

REVOKE ALL ON TABLE public.interest_categories, public.interests, public.user_interests,
  public.group_discovery_profiles, public.group_interests FROM anon, authenticated;
--> statement-breakpoint
GRANT ALL ON TABLE public.interest_categories, public.interests, public.user_interests,
  public.group_discovery_profiles, public.group_interests TO service_role;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.set_user_interests(p_user_id uuid, p_interest_slugs text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_slugs text[] := ARRAY(SELECT DISTINCT unnest(COALESCE(p_interest_slugs, ARRAY[]::text[])));
BEGIN
  IF cardinality(v_slugs) > 10 THEN RAISE EXCEPTION 'A profile can have at most 10 interests'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_slugs) slug LEFT JOIN public.interests i ON i.slug = slug WHERE i.slug IS NULL) THEN RAISE EXCEPTION 'Unknown interest'; END IF;
  DELETE FROM public.user_interests WHERE user_id = p_user_id;
  INSERT INTO public.user_interests(user_id, interest_slug) SELECT p_user_id, slug FROM unnest(v_slugs) slug;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.set_group_discovery_profile(
  p_chat_id uuid, p_primary_category_slug text, p_topic_slugs text[], p_language text, p_region text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_topics text[] := ARRAY(SELECT DISTINCT unnest(COALESCE(p_topic_slugs, ARRAY[]::text[])));
BEGIN
  IF cardinality(v_topics) > 5 THEN RAISE EXCEPTION 'A group can have at most 5 topics'; END IF;
  IF p_primary_category_slug IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.interest_categories WHERE slug = p_primary_category_slug) THEN RAISE EXCEPTION 'Unknown primary category'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_topics) slug LEFT JOIN public.interests i ON i.slug = slug WHERE i.slug IS NULL) THEN RAISE EXCEPTION 'Unknown topic'; END IF;
  INSERT INTO public.group_discovery_profiles(chat_id, primary_category_slug, language, region, updated_at)
  VALUES (p_chat_id, p_primary_category_slug, COALESCE(NULLIF(trim(p_language), ''), 'ru'), NULLIF(trim(p_region), ''), now())
  ON CONFLICT (chat_id) DO UPDATE SET primary_category_slug = EXCLUDED.primary_category_slug,
    language = EXCLUDED.language, region = EXCLUDED.region, updated_at = now();
  DELETE FROM public.group_interests WHERE chat_id = p_chat_id;
  INSERT INTO public.group_interests(chat_id, interest_slug) SELECT p_chat_id, slug FROM unnest(v_topics) slug;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.set_user_interests(uuid, text[]) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.set_group_discovery_profile(uuid, text, text[], text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.set_user_interests(uuid, text[]) TO service_role;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.set_group_discovery_profile(uuid, text, text[], text, text) TO service_role;
