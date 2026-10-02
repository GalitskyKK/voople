-- Legacy promo compatibility only; no seeds, rewards or runtime behavior changes.
-- Evidence captured 2026-10-01T11:09:53.405Z; canonical LF SHA-256 240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db
-- Historical RPC candidate matches the attested pg_get_functiondef MD5/LF.
-- Replica identity is unattested and excluded from this REST/RPC contract.
DO $create$
BEGIN
  IF to_regclass('public.promo_codes') IS NULL THEN
    CREATE TABLE public.promo_codes (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      code character varying(50) NOT NULL,
      kind character varying(40) NOT NULL,
      payload jsonb DEFAULT '{}'::jsonb NOT NULL,
      max_redemptions integer,
      redemption_count integer DEFAULT 0 NOT NULL,
      max_per_user integer DEFAULT 1 NOT NULL,
      valid_from timestamp with time zone,
      valid_until timestamp with time zone,
      is_active boolean DEFAULT true NOT NULL,
      note character varying(200),
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT promo_codes_code_unique UNIQUE (code),
      CONSTRAINT promo_codes_max_per_user_check CHECK (max_per_user >= 1),
      CONSTRAINT promo_codes_pkey PRIMARY KEY (id),
      CONSTRAINT promo_codes_redemption_count_check CHECK (redemption_count >= 0)
    );
    CREATE INDEX promo_codes_active_idx ON public.promo_codes USING btree (is_active, code);
    ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.promo_codes FROM PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.promo_codes TO anon, authenticated, service_role;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'GRANT MAINTAIN ON TABLE public.promo_codes TO anon, authenticated, service_role';
    END IF;
  END IF;
  IF to_regclass('public.promo_redemptions') IS NULL THEN
    CREATE TABLE public.promo_redemptions (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      promo_code_id uuid NOT NULL,
      user_id uuid NOT NULL,
      reference_type character varying(40),
      reference_id character varying(100),
      redeemed_at timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT promo_redemptions_pkey PRIMARY KEY (id),
      CONSTRAINT promo_redemptions_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE CASCADE,
      CONSTRAINT promo_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    CREATE INDEX promo_redemptions_promo_user_idx ON public.promo_redemptions USING btree (promo_code_id, user_id);
    CREATE INDEX promo_redemptions_user_idx ON public.promo_redemptions USING btree (user_id, redeemed_at DESC);
    ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.promo_redemptions FROM PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.promo_redemptions TO anon, authenticated, service_role;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'GRANT MAINTAIN ON TABLE public.promo_redemptions TO anon, authenticated, service_role';
    END IF;
  END IF;
  IF to_regprocedure('public.claim_promo_redemption(uuid,uuid,character varying,character varying)') IS NULL THEN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='claim_promo_redemption') THEN
      RAISE EXCEPTION 'Promo incompatible function signature claim_promo_redemption';
    END IF;
    EXECUTE $rpc$CREATE FUNCTION public.claim_promo_redemption(p_promo_code_id uuid, p_user_id uuid, p_reference_type character varying, p_reference_id character varying)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
$rpc$;
    REVOKE EXECUTE ON FUNCTION public.claim_promo_redemption(uuid,uuid,character varying,character varying) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.claim_promo_redemption(uuid,uuid,character varying,character varying) TO service_role;
  END IF;
END $create$;

-- BEGIN PROMO READ-ONLY VALIDATION
DO $validate$
DECLARE
  contract jsonb := $contract${
  "evidenceCapturedAt": "2026-10-01T11:09:53.405Z",
  "evidenceLfSha256": "240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db",
  "tables": [
    {
      "name": "promo_codes",
      "columns": [
        [
          "id",
          "uuid",
          false,
          "gen_random_uuid()",
          null
        ],
        [
          "code",
          "character varying(50)",
          false,
          null,
          "default"
        ],
        [
          "kind",
          "character varying(40)",
          false,
          null,
          "default"
        ],
        [
          "payload",
          "jsonb",
          false,
          "'{}'::jsonb",
          null
        ],
        [
          "max_redemptions",
          "integer",
          true,
          null,
          null
        ],
        [
          "redemption_count",
          "integer",
          false,
          "0",
          null
        ],
        [
          "max_per_user",
          "integer",
          false,
          "1",
          null
        ],
        [
          "valid_from",
          "timestamp with time zone",
          true,
          null,
          null
        ],
        [
          "valid_until",
          "timestamp with time zone",
          true,
          null,
          null
        ],
        [
          "is_active",
          "boolean",
          false,
          "true",
          null
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
        ]
      ],
      "constraints": [
        [
          "promo_codes_code_unique",
          "UNIQUE (code)",
          "u"
        ],
        [
          "promo_codes_max_per_user_check",
          "CHECK (max_per_user >= 1)",
          "c"
        ],
        [
          "promo_codes_pkey",
          "PRIMARY KEY (id)",
          "p"
        ],
        [
          "promo_codes_redemption_count_check",
          "CHECK (redemption_count >= 0)",
          "c"
        ]
      ],
      "indexes": [
        [
          "promo_codes_active_idx",
          "CREATE INDEX promo_codes_active_idx ON public.promo_codes USING btree (is_active, code)",
          false,
          false,
          null,
          null
        ],
        [
          "promo_codes_code_unique",
          "CREATE UNIQUE INDEX promo_codes_code_unique ON public.promo_codes USING btree (code)",
          false,
          true,
          null,
          null
        ],
        [
          "promo_codes_pkey",
          "CREATE UNIQUE INDEX promo_codes_pkey ON public.promo_codes USING btree (id)",
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
    },
    {
      "name": "promo_redemptions",
      "columns": [
        [
          "id",
          "uuid",
          false,
          "gen_random_uuid()",
          null
        ],
        [
          "promo_code_id",
          "uuid",
          false,
          null,
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
          "reference_type",
          "character varying(40)",
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
          "redeemed_at",
          "timestamp with time zone",
          false,
          "now()",
          null
        ]
      ],
      "constraints": [
        [
          "promo_redemptions_pkey",
          "PRIMARY KEY (id)",
          "p"
        ],
        [
          "promo_redemptions_promo_code_id_fkey",
          "FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE CASCADE",
          "f"
        ],
        [
          "promo_redemptions_user_id_fkey",
          "FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE",
          "f"
        ]
      ],
      "indexes": [
        [
          "promo_redemptions_pkey",
          "CREATE UNIQUE INDEX promo_redemptions_pkey ON public.promo_redemptions USING btree (id)",
          true,
          true,
          null,
          null
        ],
        [
          "promo_redemptions_promo_user_idx",
          "CREATE INDEX promo_redemptions_promo_user_idx ON public.promo_redemptions USING btree (promo_code_id, user_id)",
          false,
          false,
          null,
          null
        ],
        [
          "promo_redemptions_user_idx",
          "CREATE INDEX promo_redemptions_user_idx ON public.promo_redemptions USING btree (user_id, redeemed_at DESC)",
          false,
          false,
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
      "name": "claim_promo_redemption",
      "signature": "public.claim_promo_redemption(uuid,uuid,character varying,character varying)",
      "result": "uuid",
      "language": "plpgsql",
      "security": "DEFINER",
      "volatility": "v",
      "strict": false,
      "parallel": "u",
      "default_argument_count": 0,
      "config": [
        "search_path=public"
      ],
      "definition_md5_lf": "cda399bc55d01e4ed51b653a15fb52ff",
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
      RAISE EXCEPTION 'Promo incompatible table/RLS %', t->>'name';
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
        RAISE EXCEPTION 'Promo incompatible column type %.%', t->>'name',col->>0;
      END IF;
      IF actual.attnotnull = (col->>2)::boolean OR replace(actual.default_expr,'public.','') IS DISTINCT FROM replace(col->>3,'public.','') THEN
        RAISE EXCEPTION 'Promo incompatible nullability/default %.%', t->>'name',col->>0;
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
        RAISE EXCEPTION 'Promo incompatible constraint %.%',t->>'name',item->>0;
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
        RAISE EXCEPTION 'Promo incompatible index %.%',t->>'name',item->>0;
      END IF;
    END LOOP;
    -- A differently named unique index must not silently impose one use per user.
    IF t->>'name' = 'promo_redemptions' AND EXISTS (
      SELECT 1 FROM pg_index i WHERE i.indrelid=table_oid AND i.indisunique
        AND i.indnkeyatts=2 AND i.indexprs IS NULL
        AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
          FROM unnest(i.indkey::smallint[]) WITH ORDINALITY k(attnum,position)
          JOIN pg_attribute a ON a.attrelid=table_oid AND a.attnum=k.attnum
          WHERE k.position<=i.indnkeyatts)=ARRAY['promo_code_id','user_id']::text[]
    ) THEN
      RAISE EXCEPTION 'Promo incompatible per-user redemption uniqueness';
    END IF;
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
      RAISE EXCEPTION 'Promo incompatible extra policy %',t->>'name';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'policies') LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid=table_oid AND p.polname=item->>'name'
        AND p.polcmd::text=item->>'command' AND p.polpermissive=(item->>'permissive')::boolean
        AND (SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r)
          FROM unnest(p.polroles) r)=item->'roles'
        AND pg_get_expr(p.polqual,p.polrelid) IS NOT DISTINCT FROM item->>'using_expression'
        AND pg_get_expr(p.polwithcheck,p.polrelid) IS NOT DISTINCT FROM item->>'check_expression') THEN
        RAISE EXCEPTION 'Promo incompatible policy %.%',t->>'name',item->>'name';
      END IF;
    END LOOP;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'grants') LOOP
      IF NOT has_table_privilege(item->>0,table_oid,item->>1) THEN
        RAISE EXCEPTION 'Promo incompatible grant % % %',t->>'name',item->>0,item->>1;
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_class c, LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      WHERE c.oid=table_oid AND a.grantee=0) THEN
      RAISE EXCEPTION 'Promo incompatible PUBLIC table access %',t->>'name';
    END IF;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
        privilege_name := 'MAINTAIN';
        IF NOT has_table_privilege(role_name,table_oid,privilege_name) THEN
          RAISE EXCEPTION 'Promo incompatible MAINTAIN grant % %',t->>'name',role_name;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  FOR function_contract IN SELECT value FROM jsonb_array_elements(contract->'functions') LOOP
    function_oid := to_regprocedure(function_contract->>'signature');
    IF function_oid IS NULL OR (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname=function_contract->>'name') <> 1 THEN
      RAISE EXCEPTION 'Promo incompatible function signature %',function_contract->>'name';
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
      RAISE EXCEPTION 'Promo incompatible function definition %',function_contract->>'name';
    END IF;
    IF has_function_privilege('anon',function_oid,'EXECUTE')
      OR has_function_privilege('authenticated',function_oid,'EXECUTE')
      OR NOT has_function_privilege('service_role',function_oid,'EXECUTE')
      OR EXISTS (SELECT 1 FROM pg_proc p,LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
        WHERE p.oid=function_oid AND acl.grantee=0 AND acl.privilege_type='EXECUTE') THEN
      RAISE EXCEPTION 'Promo incompatible function EXECUTE privileges %',function_contract->>'name';
    END IF;
  END LOOP;
END $validate$;
-- END PROMO READ-ONLY VALIDATION
