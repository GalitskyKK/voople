-- Attested legacy signatures only. Missing functions remain missing.
-- Privilege changes only: no historical SQL replay or function replacement.
DO $commerce_privileges$
DECLARE
  v_signature text;
  v_function regprocedure;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.ensure_user_wallet(uuid)',
    'public.adjust_wallet(uuid,integer,varchar,varchar,varchar,varchar,varchar)',
    'public.purchase_shop_item_with_coins(uuid,varchar)',
    'public.extend_voople_plus_once(uuid,varchar,integer,varchar)',
    'public.claim_promo_redemption(uuid,uuid,varchar,varchar)',
    'public.accept_group_vanity_invite(varchar,uuid)'
  ] LOOP
    v_function := pg_catalog.to_regprocedure(v_signature);
    IF v_function IS NOT NULL THEN
      EXECUTE pg_catalog.format(
        'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
        v_function
      );
      EXECUTE pg_catalog.format(
        'GRANT EXECUTE ON FUNCTION %s TO service_role', v_function
      );
    END IF;
  END LOOP;
END;
$commerce_privileges$;
