-- Legacy wallet ledger compatibility only. No seeds, balance/history rewrites or billing.
-- Evidence captured 2026-10-01T11:09:53.405Z; canonical LF SHA-256 240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db
-- Three historical RPC candidates reproduce the attested pg_get_functiondef MD5/LF.
-- Replica identity is unattested and intentionally outside this REST-only contract.
DO $create$
BEGIN
  IF to_regclass('public.user_wallets') IS NULL THEN
    CREATE TABLE public.user_wallets (
      user_id uuid NOT NULL,
      balance_coins integer DEFAULT 0 NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT user_wallets_balance_coins_check CHECK (balance_coins >= 0),
      CONSTRAINT user_wallets_pkey PRIMARY KEY (user_id),
      CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.user_wallets FROM PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.user_wallets TO anon, authenticated, service_role;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'GRANT MAINTAIN ON TABLE public.user_wallets TO anon, authenticated, service_role';
    END IF;
    CREATE POLICY user_wallets_select_own ON public.user_wallets FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));
  END IF;
  IF to_regclass('public.wallet_transactions') IS NULL THEN
    CREATE TABLE public.wallet_transactions (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      user_id uuid NOT NULL,
      amount integer NOT NULL,
      balance_after integer NOT NULL,
      kind character varying(30) NOT NULL,
      reference_type character varying(30),
      reference_id character varying(100),
      note character varying(200),
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      idempotency_key character varying(200),
      CONSTRAINT wallet_transactions_balance_after_check CHECK (balance_after >= 0),
      CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
      CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX wallet_transactions_idempotency_uidx ON public.wallet_transactions USING btree (user_id, idempotency_key) WHERE (idempotency_key IS NOT NULL);
    CREATE INDEX wallet_transactions_user_idx ON public.wallet_transactions USING btree (user_id, created_at DESC);
    ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.wallet_transactions FROM PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.wallet_transactions TO anon, authenticated, service_role;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'GRANT MAINTAIN ON TABLE public.wallet_transactions TO anon, authenticated, service_role';
    END IF;
    CREATE POLICY wallet_transactions_select_own ON public.wallet_transactions FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));
  END IF;
  IF to_regprocedure('public.ensure_user_wallet(uuid)') IS NULL THEN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='ensure_user_wallet') THEN
      RAISE EXCEPTION 'Wallet ledger incompatible function signature ensure_user_wallet';
    END IF;
    EXECUTE $rpc$CREATE FUNCTION public.ensure_user_wallet(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
$rpc$;
    REVOKE EXECUTE ON FUNCTION public.ensure_user_wallet(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.ensure_user_wallet(uuid) TO service_role;
  END IF;
  IF to_regprocedure('public.adjust_wallet(uuid,integer,character varying,character varying,character varying,character varying,character varying)') IS NULL THEN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='adjust_wallet') THEN
      RAISE EXCEPTION 'Wallet ledger incompatible function signature adjust_wallet';
    END IF;
    EXECUTE $rpc$CREATE FUNCTION public.adjust_wallet(p_user_id uuid, p_amount integer, p_kind character varying, p_reference_type character varying, p_reference_id character varying, p_note character varying, p_idempotency_key character varying)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
$rpc$;
    REVOKE EXECUTE ON FUNCTION public.adjust_wallet(uuid,integer,character varying,character varying,character varying,character varying,character varying) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.adjust_wallet(uuid,integer,character varying,character varying,character varying,character varying,character varying) TO service_role;
  END IF;
  IF to_regprocedure('public.purchase_shop_item_with_coins(uuid,character varying)') IS NULL THEN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='purchase_shop_item_with_coins') THEN
      RAISE EXCEPTION 'Wallet ledger incompatible function signature purchase_shop_item_with_coins';
    END IF;
    EXECUTE $rpc$CREATE FUNCTION public.purchase_shop_item_with_coins(p_user_id uuid, p_item_id character varying)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
$rpc$;
    REVOKE EXECUTE ON FUNCTION public.purchase_shop_item_with_coins(uuid,character varying) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.purchase_shop_item_with_coins(uuid,character varying) TO service_role;
  END IF;
END $create$;

-- BEGIN WALLET LEDGER READ-ONLY VALIDATION
DO $validate$
DECLARE
  contract jsonb := $contract${
  "evidenceCapturedAt": "2026-10-01T11:09:53.405Z",
  "evidenceLfSha256": "240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db",
  "tables": [
    {
      "name": "user_wallets",
      "columns": [
        [
          "user_id",
          "uuid",
          false,
          null,
          null
        ],
        [
          "balance_coins",
          "integer",
          false,
          "0",
          null
        ],
        [
          "updated_at",
          "timestamp with time zone",
          false,
          "now()",
          null
        ]
      ],
      "constraints": [
        [
          "user_wallets_balance_coins_check",
          "CHECK (balance_coins >= 0)",
          "c"
        ],
        [
          "user_wallets_pkey",
          "PRIMARY KEY (user_id)",
          "p"
        ],
        [
          "user_wallets_user_id_fkey",
          "FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE",
          "f"
        ]
      ],
      "indexes": [
        [
          "user_wallets_pkey",
          "CREATE UNIQUE INDEX user_wallets_pkey ON public.user_wallets USING btree (user_id)",
          true,
          true,
          null,
          null
        ]
      ],
      "policies": [
        {
          "name": "user_wallets_select_own",
          "command": "r",
          "permissive": true,
          "roles": [
            "PUBLIC"
          ],
          "using_expression": "(auth.uid() = user_id)",
          "check_expression": null
        }
      ],
      "grants": [
        [
          "anon",
          "INSERT"
        ],
        [
          "anon",
          "SELECT"
        ],
        [
          "anon",
          "UPDATE"
        ],
        [
          "anon",
          "DELETE"
        ],
        [
          "anon",
          "TRUNCATE"
        ],
        [
          "anon",
          "REFERENCES"
        ],
        [
          "anon",
          "TRIGGER"
        ],
        [
          "authenticated",
          "INSERT"
        ],
        [
          "authenticated",
          "SELECT"
        ],
        [
          "authenticated",
          "UPDATE"
        ],
        [
          "authenticated",
          "DELETE"
        ],
        [
          "authenticated",
          "TRUNCATE"
        ],
        [
          "authenticated",
          "REFERENCES"
        ],
        [
          "authenticated",
          "TRIGGER"
        ],
        [
          "service_role",
          "INSERT"
        ],
        [
          "service_role",
          "SELECT"
        ],
        [
          "service_role",
          "UPDATE"
        ],
        [
          "service_role",
          "DELETE"
        ],
        [
          "service_role",
          "TRUNCATE"
        ],
        [
          "service_role",
          "REFERENCES"
        ],
        [
          "service_role",
          "TRIGGER"
        ]
      ]
    },
    {
      "name": "wallet_transactions",
      "columns": [
        [
          "id",
          "uuid",
          false,
          "gen_random_uuid()",
          null
        ],
        [
          "user_id",
          "uuid",
          false,
          null,
          null
        ],
        [
          "amount",
          "integer",
          false,
          null,
          null
        ],
        [
          "balance_after",
          "integer",
          false,
          null,
          null
        ],
        [
          "kind",
          "character varying(30)",
          false,
          null,
          "default"
        ],
        [
          "reference_type",
          "character varying(30)",
          true,
          null,
          "default"
        ],
        [
          "reference_id",
          "character varying(100)",
          true,
          null,
          "default"
        ],
        [
          "note",
          "character varying(200)",
          true,
          null,
          "default"
        ],
        [
          "created_at",
          "timestamp with time zone",
          false,
          "now()",
          null
        ],
        [
          "idempotency_key",
          "character varying(200)",
          true,
          null,
          "default"
        ]
      ],
      "constraints": [
        [
          "wallet_transactions_balance_after_check",
          "CHECK (balance_after >= 0)",
          "c"
        ],
        [
          "wallet_transactions_pkey",
          "PRIMARY KEY (id)",
          "p"
        ],
        [
          "wallet_transactions_user_id_fkey",
          "FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE",
          "f"
        ]
      ],
      "indexes": [
        [
          "wallet_transactions_idempotency_uidx",
          "CREATE UNIQUE INDEX wallet_transactions_idempotency_uidx ON public.wallet_transactions USING btree (user_id, idempotency_key) WHERE (idempotency_key IS NOT NULL)",
          false,
          true,
          "(idempotency_key IS NOT NULL)",
          null
        ],
        [
          "wallet_transactions_pkey",
          "CREATE UNIQUE INDEX wallet_transactions_pkey ON public.wallet_transactions USING btree (id)",
          true,
          true,
          null,
          null
        ],
        [
          "wallet_transactions_user_idx",
          "CREATE INDEX wallet_transactions_user_idx ON public.wallet_transactions USING btree (user_id, created_at DESC)",
          false,
          false,
          null,
          null
        ]
      ],
      "policies": [
        {
          "name": "wallet_transactions_select_own",
          "command": "r",
          "permissive": true,
          "roles": [
            "PUBLIC"
          ],
          "using_expression": "(auth.uid() = user_id)",
          "check_expression": null
        }
      ],
      "grants": [
        [
          "anon",
          "INSERT"
        ],
        [
          "anon",
          "SELECT"
        ],
        [
          "anon",
          "UPDATE"
        ],
        [
          "anon",
          "DELETE"
        ],
        [
          "anon",
          "TRUNCATE"
        ],
        [
          "anon",
          "REFERENCES"
        ],
        [
          "anon",
          "TRIGGER"
        ],
        [
          "authenticated",
          "INSERT"
        ],
        [
          "authenticated",
          "SELECT"
        ],
        [
          "authenticated",
          "UPDATE"
        ],
        [
          "authenticated",
          "DELETE"
        ],
        [
          "authenticated",
          "TRUNCATE"
        ],
        [
          "authenticated",
          "REFERENCES"
        ],
        [
          "authenticated",
          "TRIGGER"
        ],
        [
          "service_role",
          "INSERT"
        ],
        [
          "service_role",
          "SELECT"
        ],
        [
          "service_role",
          "UPDATE"
        ],
        [
          "service_role",
          "DELETE"
        ],
        [
          "service_role",
          "TRUNCATE"
        ],
        [
          "service_role",
          "REFERENCES"
        ],
        [
          "service_role",
          "TRIGGER"
        ]
      ]
    }
  ],
  "functions": [
    {
      "name": "ensure_user_wallet",
      "signature": "public.ensure_user_wallet(uuid)",
      "result": "integer",
      "language": "plpgsql",
      "security": "DEFINER",
      "volatility": "v",
      "strict": false,
      "parallel": "u",
      "default_argument_count": 0,
      "config": [
        "search_path=public"
      ],
      "definition_md5_lf": "1004769927d4c702131ceb1af7866ed9",
      "provenance": "drizzle/25-commerce-hardening.sql"
    },
    {
      "name": "adjust_wallet",
      "signature": "public.adjust_wallet(uuid,integer,character varying,character varying,character varying,character varying,character varying)",
      "result": "integer",
      "language": "plpgsql",
      "security": "DEFINER",
      "volatility": "v",
      "strict": false,
      "parallel": "u",
      "default_argument_count": 0,
      "config": [
        "search_path=public"
      ],
      "definition_md5_lf": "c9b520b2129940e0bb1211b90a2b3eb6",
      "provenance": "drizzle/25-commerce-hardening.sql"
    },
    {
      "name": "purchase_shop_item_with_coins",
      "signature": "public.purchase_shop_item_with_coins(uuid,character varying)",
      "result": "integer",
      "language": "plpgsql",
      "security": "DEFINER",
      "volatility": "v",
      "strict": false,
      "parallel": "u",
      "default_argument_count": 0,
      "config": [
        "search_path=public"
      ],
      "definition_md5_lf": "d23d824342953c6a5ac6eb1234225ff3",
      "provenance": "drizzle/25-commerce-hardening.sql"
    }
  ]
}$contract$::jsonb;
  function_contract jsonb; function_oid oid; t jsonb; col jsonb; item jsonb; table_oid oid; actual record; actual_text text;
  expected text; labels jsonb; role_name text; privilege_name text;
BEGIN
  FOR t IN SELECT value FROM jsonb_array_elements(contract->'tables') LOOP
    table_oid := to_regclass('public.' || (t->>'name'));
    IF table_oid IS NULL OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=table_oid
      AND relkind='r' AND relrowsecurity AND NOT relforcerowsecurity) THEN
      RAISE EXCEPTION 'Wallet ledger incompatible table/RLS %', t->>'name';
    END IF;
    FOR col IN SELECT value FROM jsonb_array_elements(t->'columns') LOOP
      SELECT format_type(a.atttypid,a.atttypmod) AS type, n.nspname AS type_schema,
        a.attnotnull,a.attidentity,a.attgenerated,a.attcollation,pg_get_expr(d.adbin,d.adrelid) AS default_expr
        INTO actual FROM pg_attribute a JOIN pg_type ty ON ty.oid=a.atttypid
        JOIN pg_namespace n ON n.oid=ty.typnamespace
        LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
        WHERE a.attrelid=table_oid AND a.attname=col->>0 AND a.attnum>0 AND NOT a.attisdropped;
      IF NOT FOUND OR replace(actual.type,'public.','') <> replace(col->>1,'public.','')
        OR actual.type_schema <> (CASE WHEN col->>1 LIKE 'public.%' THEN 'public' ELSE 'pg_catalog' END)
        OR actual.attidentity <> '' OR actual.attgenerated <> ''
        OR actual.attcollation <> (CASE WHEN col->>4 = 'default'
          THEN 'pg_catalog.default'::regcollation::oid ELSE 0::oid END) THEN
        RAISE EXCEPTION 'Wallet ledger incompatible column type %.%', t->>'name',col->>0;
      END IF;
      IF actual.attnotnull = (col->>2)::boolean OR replace(actual.default_expr,'public.','') IS DISTINCT FROM replace(col->>3,'public.','') THEN
        RAISE EXCEPTION 'Wallet ledger incompatible nullability/default %.%', t->>'name',col->>0;
      END IF;
    END LOOP;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'constraints') LOOP
      expected := regexp_replace(replace(item->>1,'public.',''),'\s+',' ','g');
      IF NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid=table_oid
        AND c.contype::text=item->>2 AND c.convalidated AND NOT c.condeferrable AND NOT c.condeferred
        AND (c.contype <> 'f' OR NOT EXISTS (SELECT 1 FROM pg_trigger fk
          WHERE fk.tgconstraint=c.oid AND fk.tgisinternal AND fk.tgenabled <> 'O'))
        AND regexp_replace(replace(pg_get_constraintdef(c.oid,true),'public.',''),'\s+',' ','g')=expected
        AND (c.contype NOT IN ('p','u') OR EXISTS (SELECT 1 FROM pg_index i
          WHERE i.indexrelid=c.conindid AND i.indisvalid AND i.indisready AND i.indislive))) THEN
        RAISE EXCEPTION 'Wallet ledger incompatible constraint %.%',t->>'name',item->>0;
      END IF;
    END LOOP;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'indexes') LOOP
      SELECT regexp_replace(replace(pg_get_indexdef(i.indexrelid),'public.',''),'\s+',' ','g') INTO actual_text
        FROM pg_index i JOIN pg_class idx ON idx.oid=i.indexrelid
        WHERE i.indrelid=table_oid AND idx.relname=item->>0 AND i.indisvalid AND i.indisready AND i.indislive
          AND i.indisprimary=(item->>2)::boolean AND i.indisunique=(item->>3)::boolean
          AND pg_get_expr(i.indpred,i.indrelid) IS NOT DISTINCT FROM item->>4
          AND pg_get_expr(i.indexprs,i.indrelid) IS NOT DISTINCT FROM item->>5;
      IF actual_text IS DISTINCT FROM regexp_replace(replace(item->>1,'public.',''),'\s+',' ','g') THEN
        RAISE EXCEPTION 'Wallet ledger incompatible index %.%',t->>'name',item->>0;
      END IF;
    END LOOP;
    -- Preserve neutral restrictive policies and equivalent duplicate policies.
    -- Other extra policies can change the effective PUBLIC/browser contract.
    IF EXISTS (SELECT 1 FROM pg_policy extra WHERE extra.polrelid=table_oid
      AND NOT (NOT extra.polpermissive
        AND coalesce(pg_get_expr(extra.polqual,extra.polrelid),'true')='true'
        AND coalesce(pg_get_expr(extra.polwithcheck,extra.polrelid),'true')='true')
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(t->'policies') p WHERE
        extra.polcmd::text=p->>'command' AND extra.polpermissive=(p->>'permissive')::boolean
        AND (SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r)
          FROM unnest(extra.polroles) r)=p->'roles'
        AND pg_get_expr(extra.polqual,extra.polrelid) IS NOT DISTINCT FROM p->>'using_expression'
        AND pg_get_expr(extra.polwithcheck,extra.polrelid) IS NOT DISTINCT FROM p->>'check_expression')) THEN
      RAISE EXCEPTION 'Wallet ledger incompatible extra policy %',t->>'name';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'policies') LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid=table_oid AND p.polname=item->>'name'
        AND p.polcmd::text=item->>'command' AND p.polpermissive=(item->>'permissive')::boolean
        AND (SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r)
          FROM unnest(p.polroles) r)=item->'roles'
        AND pg_get_expr(p.polqual,p.polrelid) IS NOT DISTINCT FROM item->>'using_expression'
        AND pg_get_expr(p.polwithcheck,p.polrelid) IS NOT DISTINCT FROM item->>'check_expression') THEN
        RAISE EXCEPTION 'Wallet ledger incompatible policy %.%',t->>'name',item->>'name';
      END IF;
    END LOOP;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'grants') LOOP
      IF NOT has_table_privilege(item->>0,table_oid,item->>1) THEN
        RAISE EXCEPTION 'Wallet ledger incompatible grant % % %',t->>'name',item->>0,item->>1;
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_class c, LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      WHERE c.oid=table_oid AND a.grantee=0) THEN
      RAISE EXCEPTION 'Wallet ledger incompatible PUBLIC table access %',t->>'name';
    END IF;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
        privilege_name := 'MAINTAIN';
        IF NOT has_table_privilege(role_name,table_oid,privilege_name) THEN
          RAISE EXCEPTION 'Wallet ledger incompatible MAINTAIN grant % %',t->>'name',role_name;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  FOR function_contract IN SELECT value FROM jsonb_array_elements(contract->'functions') LOOP
    function_oid := to_regprocedure(function_contract->>'signature');
    IF function_oid IS NULL OR (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname=function_contract->>'name') <> 1 THEN
      RAISE EXCEPTION 'Wallet ledger incompatible function signature %',function_contract->>'name';
    END IF;
    SELECT p.*,l.lanname,pg_get_function_result(p.oid) AS result,
      md5(replace(pg_get_functiondef(p.oid),chr(13)||chr(10),chr(10))) AS definition_hash
      INTO actual FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=function_oid;
    IF actual.prokind <> 'f' OR actual.result <> function_contract->>'result'
      OR actual.lanname <> 'plpgsql' OR NOT actual.prosecdef OR actual.provolatile <> 'v'
      OR actual.proisstrict <> (function_contract->>'strict')::boolean
      OR actual.proparallel::text <> function_contract->>'parallel'
      OR actual.pronargdefaults <> (function_contract->>'default_argument_count')::integer
      OR to_jsonb(actual.proconfig) IS DISTINCT FROM function_contract->'config'
      OR actual.definition_hash <> function_contract->>'definition_md5_lf' THEN
      RAISE EXCEPTION 'Wallet ledger incompatible function definition %',function_contract->>'name';
    END IF;
    IF has_function_privilege('anon',function_oid,'EXECUTE')
      OR has_function_privilege('authenticated',function_oid,'EXECUTE')
      OR NOT has_function_privilege('service_role',function_oid,'EXECUTE')
      OR EXISTS (SELECT 1 FROM pg_proc p,LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
        WHERE p.oid=function_oid AND acl.grantee=0 AND acl.privilege_type='EXECUTE') THEN
      RAISE EXCEPTION 'Wallet ledger incompatible function EXECUTE privileges %',function_contract->>'name';
    END IF;
  END LOOP;
END $validate$;
-- END WALLET LEDGER READ-ONLY VALIDATION
