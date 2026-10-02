-- Legacy payment/fulfillment compatibility only; no seeds, fulfillment calls or billing changes.
-- Evidence captured 2026-10-01T11:09:53.405Z; canonical LF SHA-256 240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db
-- Historical RPC candidate reproduces the attested pg_get_functiondef MD5/LF.
-- Replica identity is unattested and outside this REST/RPC-only contract.
DO $create$
BEGIN
  IF to_regclass('public.payment_intents') IS NULL THEN
    CREATE TABLE public.payment_intents (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      user_id uuid NOT NULL,
      kind character varying(30) NOT NULL,
      amount_rub integer NOT NULL,
      status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
      provider character varying(30) DEFAULT 'yookassa'::character varying NOT NULL,
      external_id character varying(200),
      metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT payment_intents_amount_rub_check CHECK (amount_rub > 0),
      CONSTRAINT payment_intents_pkey PRIMARY KEY (id),
      CONSTRAINT payment_intents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX payment_intents_external_uidx ON public.payment_intents USING btree (provider, external_id) WHERE (external_id IS NOT NULL);
    CREATE INDEX payment_intents_user_idx ON public.payment_intents USING btree (user_id, created_at DESC);
    ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.payment_intents FROM PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.payment_intents TO anon, authenticated, service_role;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'GRANT MAINTAIN ON TABLE public.payment_intents TO anon, authenticated, service_role';
    END IF;
    CREATE POLICY payment_intents_select_own ON public.payment_intents FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));
  END IF;
  IF to_regclass('public.subscription_fulfillments') IS NULL THEN
    CREATE TABLE public.subscription_fulfillments (
      external_id character varying(200) NOT NULL,
      user_id uuid NOT NULL,
      provider character varying(40) NOT NULL,
      period_days integer NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT subscription_fulfillments_period_days_check CHECK (period_days > 0 AND period_days <= 3650),
      CONSTRAINT subscription_fulfillments_pkey PRIMARY KEY (external_id),
      CONSTRAINT subscription_fulfillments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    ALTER TABLE public.subscription_fulfillments ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.subscription_fulfillments FROM PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.subscription_fulfillments TO anon, authenticated, service_role;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'GRANT MAINTAIN ON TABLE public.subscription_fulfillments TO anon, authenticated, service_role';
    END IF;
  END IF;
  IF to_regprocedure('public.extend_voople_plus_once(uuid,character varying,integer,character varying)') IS NULL THEN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='extend_voople_plus_once') THEN
      RAISE EXCEPTION 'Payment fulfillment incompatible function signature extend_voople_plus_once';
    END IF;
    EXECUTE $rpc$CREATE FUNCTION public.extend_voople_plus_once(p_user_id uuid, p_external_id character varying, p_period_days integer, p_provider character varying)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
$rpc$;
    REVOKE EXECUTE ON FUNCTION public.extend_voople_plus_once(uuid,character varying,integer,character varying) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.extend_voople_plus_once(uuid,character varying,integer,character varying) TO service_role;
  END IF;
END $create$;

-- BEGIN PAYMENT FULFILLMENT READ-ONLY VALIDATION
DO $validate$
DECLARE
  contract jsonb := $contract${
  "evidenceCapturedAt": "2026-10-01T11:09:53.405Z",
  "evidenceLfSha256": "240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db",
  "tables": [
    {
      "name": "payment_intents",
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
          "kind",
          "character varying(30)",
          false,
          null,
          "default"
        ],
        [
          "amount_rub",
          "integer",
          false,
          null,
          null
        ],
        [
          "status",
          "character varying(20)",
          false,
          "'pending'::character varying",
          "default"
        ],
        [
          "provider",
          "character varying(30)",
          false,
          "'yookassa'::character varying",
          "default"
        ],
        [
          "external_id",
          "character varying(200)",
          true,
          null,
          "default"
        ],
        [
          "metadata",
          "jsonb",
          false,
          "'{}'::jsonb",
          null
        ],
        [
          "created_at",
          "timestamp with time zone",
          false,
          "now()",
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
          "payment_intents_amount_rub_check",
          "CHECK (amount_rub > 0)",
          "c"
        ],
        [
          "payment_intents_pkey",
          "PRIMARY KEY (id)",
          "p"
        ],
        [
          "payment_intents_user_id_fkey",
          "FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE",
          "f"
        ]
      ],
      "indexes": [
        [
          "payment_intents_external_uidx",
          "CREATE UNIQUE INDEX payment_intents_external_uidx ON public.payment_intents USING btree (provider, external_id) WHERE (external_id IS NOT NULL)",
          false,
          true,
          "(external_id IS NOT NULL)",
          null
        ],
        [
          "payment_intents_pkey",
          "CREATE UNIQUE INDEX payment_intents_pkey ON public.payment_intents USING btree (id)",
          true,
          true,
          null,
          null
        ],
        [
          "payment_intents_user_idx",
          "CREATE INDEX payment_intents_user_idx ON public.payment_intents USING btree (user_id, created_at DESC)",
          false,
          false,
          null,
          null
        ]
      ],
      "policies": [
        {
          "name": "payment_intents_select_own",
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
      "name": "subscription_fulfillments",
      "columns": [
        [
          "external_id",
          "character varying(200)",
          false,
          null,
          "default"
        ],
        [
          "user_id",
          "uuid",
          false,
          null,
          null
        ],
        [
          "provider",
          "character varying(40)",
          false,
          null,
          "default"
        ],
        [
          "period_days",
          "integer",
          false,
          null,
          null
        ],
        [
          "created_at",
          "timestamp with time zone",
          false,
          "now()",
          null
        ]
      ],
      "constraints": [
        [
          "subscription_fulfillments_period_days_check",
          "CHECK (period_days > 0 AND period_days <= 3650)",
          "c"
        ],
        [
          "subscription_fulfillments_pkey",
          "PRIMARY KEY (external_id)",
          "p"
        ],
        [
          "subscription_fulfillments_user_id_fkey",
          "FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE",
          "f"
        ]
      ],
      "indexes": [
        [
          "subscription_fulfillments_pkey",
          "CREATE UNIQUE INDEX subscription_fulfillments_pkey ON public.subscription_fulfillments USING btree (external_id)",
          true,
          true,
          null,
          null
        ]
      ],
      "policies": [],
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
      "name": "extend_voople_plus_once",
      "signature": "public.extend_voople_plus_once(uuid,character varying,integer,character varying)",
      "result": "boolean",
      "language": "plpgsql",
      "security": "DEFINER",
      "volatility": "v",
      "strict": false,
      "parallel": "u",
      "default_argument_count": 0,
      "config": [
        "search_path=public"
      ],
      "definition_md5_lf": "ef7d9439bb76b3837aa549bae16d8c62",
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
      RAISE EXCEPTION 'Payment fulfillment incompatible table/RLS %', t->>'name';
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
        RAISE EXCEPTION 'Payment fulfillment incompatible column type %.%', t->>'name',col->>0;
      END IF;
      IF actual.attnotnull = (col->>2)::boolean OR replace(actual.default_expr,'public.','') IS DISTINCT FROM replace(col->>3,'public.','') THEN
        RAISE EXCEPTION 'Payment fulfillment incompatible nullability/default %.%', t->>'name',col->>0;
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
        RAISE EXCEPTION 'Payment fulfillment incompatible constraint %.%',t->>'name',item->>0;
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
        RAISE EXCEPTION 'Payment fulfillment incompatible index %.%',t->>'name',item->>0;
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
      RAISE EXCEPTION 'Payment fulfillment incompatible extra policy %',t->>'name';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'policies') LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid=table_oid AND p.polname=item->>'name'
        AND p.polcmd::text=item->>'command' AND p.polpermissive=(item->>'permissive')::boolean
        AND (SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r)
          FROM unnest(p.polroles) r)=item->'roles'
        AND pg_get_expr(p.polqual,p.polrelid) IS NOT DISTINCT FROM item->>'using_expression'
        AND pg_get_expr(p.polwithcheck,p.polrelid) IS NOT DISTINCT FROM item->>'check_expression') THEN
        RAISE EXCEPTION 'Payment fulfillment incompatible policy %.%',t->>'name',item->>'name';
      END IF;
    END LOOP;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'grants') LOOP
      IF NOT has_table_privilege(item->>0,table_oid,item->>1) THEN
        RAISE EXCEPTION 'Payment fulfillment incompatible grant % % %',t->>'name',item->>0,item->>1;
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_class c, LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      WHERE c.oid=table_oid AND a.grantee=0) THEN
      RAISE EXCEPTION 'Payment fulfillment incompatible PUBLIC table access %',t->>'name';
    END IF;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
        privilege_name := 'MAINTAIN';
        IF NOT has_table_privilege(role_name,table_oid,privilege_name) THEN
          RAISE EXCEPTION 'Payment fulfillment incompatible MAINTAIN grant % %',t->>'name',role_name;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  FOR function_contract IN SELECT value FROM jsonb_array_elements(contract->'functions') LOOP
    function_oid := to_regprocedure(function_contract->>'signature');
    IF function_oid IS NULL OR (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname=function_contract->>'name') <> 1 THEN
      RAISE EXCEPTION 'Payment fulfillment incompatible function signature %',function_contract->>'name';
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
      RAISE EXCEPTION 'Payment fulfillment incompatible function definition %',function_contract->>'name';
    END IF;
    IF has_function_privilege('anon',function_oid,'EXECUTE')
      OR has_function_privilege('authenticated',function_oid,'EXECUTE')
      OR NOT has_function_privilege('service_role',function_oid,'EXECUTE')
      OR EXISTS (SELECT 1 FROM pg_proc p,LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
        WHERE p.oid=function_oid AND acl.grantee=0 AND acl.privilege_type='EXECUTE') THEN
      RAISE EXCEPTION 'Payment fulfillment incompatible function EXECUTE privileges %',function_contract->>'name';
    END IF;
  END LOOP;
END $validate$;
-- END PAYMENT FULFILLMENT READ-ONLY VALIDATION
