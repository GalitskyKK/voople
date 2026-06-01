-- STEP 1 of 2: run THIS FILE ALONE in Supabase SQL Editor, then run 12-shop-currency.sql
--
-- PostgreSQL cannot use new enum labels in the same transaction as ADD VALUE.
-- Supabase runs one editor tab as one transaction — enum adds must commit first.

ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'decoration';
ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'feed_card';
ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'app_theme';
ALTER TYPE public.acquired_via ADD VALUE IF NOT EXISTS 'free_claim';
