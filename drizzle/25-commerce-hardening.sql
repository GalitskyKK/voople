-- Atomic wallet operations, promo claims and subscription fulfillment.
-- Apply after 12-shop-currency.sql and 17-promo-codes.sql.

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key varchar(200);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_idempotency_uidx
  ON public.wallet_transactions (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ensure_user_wallet(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_created integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':wallet', 0));

  INSERT INTO public.user_wallets (user_id, balance_coins)
  VALUES (p_user_id, 500)
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_created = ROW_COUNT;

  IF v_created > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id, amount, balance_after, kind, reference_type, note, idempotency_key
    )
    VALUES (
      p_user_id, 500, 500, 'earn', 'welcome_bonus', 'Приветственный бонус',
      'welcome:' || p_user_id::text
    );
  END IF;

  SELECT balance_coins INTO v_balance
  FROM public.user_wallets
  WHERE user_id = p_user_id;
  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_wallet(
  p_user_id uuid,
  p_amount integer,
  p_kind varchar,
  p_reference_type varchar,
  p_reference_id varchar,
  p_note varchar,
  p_idempotency_key varchar
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
BEGIN
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Amount must not be zero';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'Idempotency key is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_idempotency_key, 0));

  SELECT w.balance_coins
  INTO v_balance
  FROM public.wallet_transactions tx
  JOIN public.user_wallets w ON w.user_id = tx.user_id
  WHERE tx.user_id = p_user_id
    AND tx.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_balance;
  END IF;

  PERFORM public.ensure_user_wallet(p_user_id);

  SELECT balance_coins
  INTO v_balance
  FROM public.user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_balance := v_balance + p_amount;
  IF v_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.user_wallets
  SET balance_coins = v_balance, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions (
    user_id, amount, balance_after, kind, reference_type, reference_id, note, idempotency_key
  )
  VALUES (
    p_user_id, p_amount, v_balance, p_kind, p_reference_type, p_reference_id, p_note,
    p_idempotency_key
  );

  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_shop_item_with_coins(
  p_user_id uuid,
  p_item_id varchar
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price integer;
  v_name text;
  v_is_free boolean;
  v_balance integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':purchase:' || p_item_id, 0));

  SELECT price_coins, name, is_free
  INTO v_price, v_name, v_is_free
  FROM public.shop_items
  WHERE id = p_item_id
  FOR SHARE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF v_is_free THEN RAISE EXCEPTION 'Item is free'; END IF;
  IF v_price <= 0 THEN RAISE EXCEPTION 'Item is not available for coins'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_inventory
    WHERE user_id = p_user_id AND item_id = p_item_id
  ) THEN
    RAISE EXCEPTION 'Item already owned';
  END IF;

  v_balance := public.adjust_wallet(
    p_user_id,
    -v_price,
    'spend',
    'shop_item',
    p_item_id,
    'Покупка: ' || v_name,
    'purchase:' || p_item_id
  );

  INSERT INTO public.user_inventory (user_id, item_id, acquired_via)
  VALUES (p_user_id, p_item_id, 'purchase');

  RETURN v_balance;
END;
$$;

CREATE TABLE IF NOT EXISTS public.subscription_fulfillments (
  external_id varchar(200) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider varchar(40) NOT NULL,
  period_days integer NOT NULL CHECK (period_days > 0 AND period_days <= 3650),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_fulfillments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.extend_voople_plus_once(
  p_user_id uuid,
  p_external_id varchar,
  p_period_days integer,
  p_provider varchar
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer;
  v_now timestamptz := now();
BEGIN
  IF p_period_days < 1 OR p_period_days > 3650 THEN
    RAISE EXCEPTION 'Invalid subscription period';
  END IF;

  INSERT INTO public.subscription_fulfillments (external_id, user_id, provider, period_days)
  VALUES (p_external_id, p_user_id, p_provider, p_period_days)
  ON CONFLICT (external_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN RETURN false; END IF;

  INSERT INTO public.subscriptions (
    user_id, tier, started_at, expires_at, payment_provider, external_id
  )
  VALUES (
    p_user_id, 'plus'::subscription_tier, v_now,
    v_now + make_interval(days => p_period_days), p_provider, p_external_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tier = 'plus'::subscription_tier,
    started_at = CASE
      WHEN public.subscriptions.expires_at > v_now
        THEN public.subscriptions.started_at
      ELSE v_now
    END,
    expires_at = greatest(public.subscriptions.expires_at, v_now)
      + make_interval(days => p_period_days),
    payment_provider = p_provider,
    external_id = p_external_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_promo_redemption(
  p_promo_code_id uuid,
  p_user_id uuid,
  p_reference_type varchar,
  p_reference_id varchar
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo public.promo_codes%ROWTYPE;
  v_user_count integer;
  v_redemption_id uuid;
BEGIN
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE id = p_promo_code_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_promo.is_active THEN RAISE EXCEPTION 'Promo is inactive'; END IF;
  IF v_promo.valid_from IS NOT NULL AND v_promo.valid_from > now() THEN
    RAISE EXCEPTION 'Promo is not active yet';
  END IF;
  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < now() THEN
    RAISE EXCEPTION 'Promo has expired';
  END IF;
  IF v_promo.max_redemptions IS NOT NULL
    AND v_promo.redemption_count >= v_promo.max_redemptions THEN
    RAISE EXCEPTION 'Promo limit reached';
  END IF;

  SELECT count(*)::integer INTO v_user_count
  FROM public.promo_redemptions
  WHERE promo_code_id = p_promo_code_id AND user_id = p_user_id;
  IF v_user_count >= v_promo.max_per_user THEN
    RAISE EXCEPTION 'Promo already used';
  END IF;

  INSERT INTO public.promo_redemptions (
    promo_code_id, user_id, reference_type, reference_id
  )
  VALUES (p_promo_code_id, p_user_id, p_reference_type, p_reference_id)
  RETURNING id INTO v_redemption_id;

  UPDATE public.promo_codes
  SET redemption_count = redemption_count + 1
  WHERE id = p_promo_code_id;

  RETURN v_redemption_id;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_wallet(uuid, integer, varchar, varchar, varchar, varchar, varchar) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_user_wallet(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purchase_shop_item_with_coins(uuid, varchar) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.extend_voople_plus_once(uuid, varchar, integer, varchar) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_promo_redemption(uuid, uuid, varchar, varchar) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.adjust_wallet(uuid, integer, varchar, varchar, varchar, varchar, varchar) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_wallet(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.purchase_shop_item_with_coins(uuid, varchar) TO service_role;
GRANT EXECUTE ON FUNCTION public.extend_voople_plus_once(uuid, varchar, integer, varchar) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_promo_redemption(uuid, uuid, varchar, varchar) TO service_role;
