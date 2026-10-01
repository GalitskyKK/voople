-- Legacy commerce prerequisite only; no billing, charge or plan issuance.
-- Evidence captured 2026-10-01T11:09:53.405Z; canonical LF SHA-256:
-- 240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db
-- Dependency order is 45 -> 82 -> 83 -> 38/39/43 -> 46..81.
-- Existing objects are validated without repair or data changes.
DO $create$
BEGIN
  IF to_regtype('public.subscription_tier') IS NULL THEN
    CREATE TYPE public.subscription_tier AS ENUM ('plus','pro');
  END IF;
  IF to_regclass('public.subscriptions') IS NULL THEN
    CREATE TABLE public.subscriptions (
      user_id uuid NOT NULL,
      tier public.subscription_tier NOT NULL,
      started_at timestamp without time zone DEFAULT now() NOT NULL,
      expires_at timestamp without time zone NOT NULL,
      payment_provider character varying(50) NOT NULL,
      external_id character varying(200) NOT NULL,
      CONSTRAINT subscriptions_pkey PRIMARY KEY (user_id),
      CONSTRAINT subscriptions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.subscriptions FROM PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.subscriptions TO anon, authenticated, service_role;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'GRANT MAINTAIN ON TABLE public.subscriptions TO anon, authenticated, service_role';
    END IF;
    CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));
  END IF;
  IF to_regclass('public.group_boosts') IS NULL THEN
    CREATE TABLE public.group_boosts (
      user_id uuid NOT NULL,
      chat_id uuid,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      slot smallint NOT NULL,
      assigned_at timestamp with time zone NOT NULL,
      moved_at timestamp with time zone NOT NULL,
      idempotency_key uuid NOT NULL,
      CONSTRAINT group_boosts_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
      CONSTRAINT group_boosts_slot_check CHECK (slot >= 1 AND slot <= 3),
      CONSTRAINT group_boosts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    CREATE INDEX group_boosts_chat_idx ON public.group_boosts USING btree (chat_id);
    CREATE UNIQUE INDEX group_boosts_idempotency_unique ON public.group_boosts USING btree (user_id, idempotency_key);
    CREATE UNIQUE INDEX group_boosts_user_slot_unique ON public.group_boosts USING btree (user_id, slot);
    ALTER TABLE public.group_boosts ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.group_boosts FROM PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.group_boosts TO anon, authenticated, service_role;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'GRANT MAINTAIN ON TABLE public.group_boosts TO anon, authenticated, service_role';
    END IF;
  END IF;
  IF to_regclass('public.group_customization') IS NULL THEN
    CREATE TABLE public.group_customization (
      chat_id uuid NOT NULL,
      description character varying(160),
      icon character varying(16),
      accent_color character varying(7),
      updated_at timestamp with time zone DEFAULT now() NOT NULL,
      public_slug character varying(32),
      avatar_key character varying(512),
      boost_grace_until timestamp with time zone,
      boost_grace_level smallint,
      banner_key character varying(512),
      tag character varying(5),
      vanity_invite_slug character varying(32),
      owner_role_color character varying(7),
      admin_role_color character varying(7),
      member_role_color character varying(7),
      CONSTRAINT group_customization_accent_check CHECK (accent_color IS NULL OR accent_color::text ~ '^#[0-9A-Fa-f]{6}$'::text),
      CONSTRAINT group_customization_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE,
      CONSTRAINT group_customization_pkey PRIMARY KEY (chat_id),
      CONSTRAINT group_customization_public_slug_check CHECK (public_slug IS NULL OR public_slug::text ~ '^[a-z0-9_]{5,32}$'::text),
      CONSTRAINT group_customization_role_colors_check CHECK ((owner_role_color IS NULL OR owner_role_color::text ~ '^#[0-9a-fA-F]{6}$'::text) AND (admin_role_color IS NULL OR admin_role_color::text ~ '^#[0-9a-fA-F]{6}$'::text) AND (member_role_color IS NULL OR member_role_color::text ~ '^#[0-9a-fA-F]{6}$'::text)),
      CONSTRAINT group_customization_tag_format_check CHECK (tag IS NULL OR tag::text ~ '^[[:alnum:]]{2,5}$'::text),
      CONSTRAINT group_customization_vanity_invite_slug_format_check CHECK (vanity_invite_slug IS NULL OR vanity_invite_slug::text ~ '^[a-z0-9_]{5,32}$'::text)
    );
    CREATE UNIQUE INDEX group_customization_public_slug_unique ON public.group_customization USING btree (public_slug) WHERE (public_slug IS NOT NULL);
    CREATE UNIQUE INDEX group_customization_vanity_invite_slug_unique ON public.group_customization USING btree (vanity_invite_slug) WHERE (vanity_invite_slug IS NOT NULL);
    ALTER TABLE public.group_customization ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.group_customization FROM PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.group_customization TO anon, authenticated, service_role;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'GRANT MAINTAIN ON TABLE public.group_customization TO anon, authenticated, service_role';
    END IF;
  END IF;
END $create$;

-- BEGIN COMMERCE PREREQUISITE READ-ONLY VALIDATION
DO $validate$
DECLARE
  contract jsonb := $contract${
  "evidenceCapturedAt": "2026-10-01T11:09:53.405Z",
  "evidenceLfSha256": "240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db",
  "labels": [
    "plus",
    "pro"
  ],
  "tables": [
    {
      "name": "subscriptions",
      "columns": [
        [
          "user_id",
          "uuid",
          false,
          null
        ],
        [
          "tier",
          "public.subscription_tier",
          false,
          null
        ],
        [
          "started_at",
          "timestamp without time zone",
          false,
          "now()"
        ],
        [
          "expires_at",
          "timestamp without time zone",
          false,
          null
        ],
        [
          "payment_provider",
          "character varying(50)",
          false,
          null
        ],
        [
          "external_id",
          "character varying(200)",
          false,
          null
        ]
      ],
      "constraints": [
        [
          "subscriptions_pkey",
          "PRIMARY KEY (user_id)",
          "p"
        ],
        [
          "subscriptions_user_id_users_id_fk",
          "FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE",
          "f"
        ]
      ],
      "indexes": [
        [
          "subscriptions_pkey",
          "CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (user_id)",
          true,
          true,
          null
        ]
      ],
      "policies": [
        {
          "name": "subscriptions_select_own",
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
      "name": "group_boosts",
      "columns": [
        [
          "user_id",
          "uuid",
          false,
          null
        ],
        [
          "chat_id",
          "uuid",
          true,
          null
        ],
        [
          "created_at",
          "timestamp with time zone",
          false,
          "now()"
        ],
        [
          "slot",
          "smallint",
          false,
          null
        ],
        [
          "assigned_at",
          "timestamp with time zone",
          false,
          null
        ],
        [
          "moved_at",
          "timestamp with time zone",
          false,
          null
        ],
        [
          "idempotency_key",
          "uuid",
          false,
          null
        ]
      ],
      "constraints": [
        [
          "group_boosts_chat_id_fkey",
          "FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE",
          "f"
        ],
        [
          "group_boosts_slot_check",
          "CHECK (slot >= 1 AND slot <= 3)",
          "c"
        ],
        [
          "group_boosts_user_id_fkey",
          "FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE",
          "f"
        ]
      ],
      "indexes": [
        [
          "group_boosts_chat_idx",
          "CREATE INDEX group_boosts_chat_idx ON public.group_boosts USING btree (chat_id)",
          false,
          false,
          null
        ],
        [
          "group_boosts_idempotency_unique",
          "CREATE UNIQUE INDEX group_boosts_idempotency_unique ON public.group_boosts USING btree (user_id, idempotency_key)",
          false,
          true,
          null
        ],
        [
          "group_boosts_user_slot_unique",
          "CREATE UNIQUE INDEX group_boosts_user_slot_unique ON public.group_boosts USING btree (user_id, slot)",
          false,
          true,
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
      "name": "group_customization",
      "columns": [
        [
          "chat_id",
          "uuid",
          false,
          null
        ],
        [
          "description",
          "character varying(160)",
          true,
          null
        ],
        [
          "icon",
          "character varying(16)",
          true,
          null
        ],
        [
          "accent_color",
          "character varying(7)",
          true,
          null
        ],
        [
          "updated_at",
          "timestamp with time zone",
          false,
          "now()"
        ],
        [
          "public_slug",
          "character varying(32)",
          true,
          null
        ],
        [
          "avatar_key",
          "character varying(512)",
          true,
          null
        ],
        [
          "boost_grace_until",
          "timestamp with time zone",
          true,
          null
        ],
        [
          "boost_grace_level",
          "smallint",
          true,
          null
        ],
        [
          "banner_key",
          "character varying(512)",
          true,
          null
        ],
        [
          "tag",
          "character varying(5)",
          true,
          null
        ],
        [
          "vanity_invite_slug",
          "character varying(32)",
          true,
          null
        ],
        [
          "owner_role_color",
          "character varying(7)",
          true,
          null
        ],
        [
          "admin_role_color",
          "character varying(7)",
          true,
          null
        ],
        [
          "member_role_color",
          "character varying(7)",
          true,
          null
        ]
      ],
      "constraints": [
        [
          "group_customization_accent_check",
          "CHECK (accent_color IS NULL OR accent_color::text ~ '^#[0-9A-Fa-f]{6}$'::text)",
          "c"
        ],
        [
          "group_customization_chat_id_fkey",
          "FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE",
          "f"
        ],
        [
          "group_customization_pkey",
          "PRIMARY KEY (chat_id)",
          "p"
        ],
        [
          "group_customization_public_slug_check",
          "CHECK (public_slug IS NULL OR public_slug::text ~ '^[a-z0-9_]{5,32}$'::text)",
          "c"
        ],
        [
          "group_customization_role_colors_check",
          "CHECK ((owner_role_color IS NULL OR owner_role_color::text ~ '^#[0-9a-fA-F]{6}$'::text) AND (admin_role_color IS NULL OR admin_role_color::text ~ '^#[0-9a-fA-F]{6}$'::text) AND (member_role_color IS NULL OR member_role_color::text ~ '^#[0-9a-fA-F]{6}$'::text))",
          "c"
        ],
        [
          "group_customization_tag_format_check",
          "CHECK (tag IS NULL OR tag::text ~ '^[[:alnum:]]{2,5}$'::text)",
          "c"
        ],
        [
          "group_customization_vanity_invite_slug_format_check",
          "CHECK (vanity_invite_slug IS NULL OR vanity_invite_slug::text ~ '^[a-z0-9_]{5,32}$'::text)",
          "c"
        ]
      ],
      "indexes": [
        [
          "group_customization_pkey",
          "CREATE UNIQUE INDEX group_customization_pkey ON public.group_customization USING btree (chat_id)",
          true,
          true,
          null
        ],
        [
          "group_customization_public_slug_unique",
          "CREATE UNIQUE INDEX group_customization_public_slug_unique ON public.group_customization USING btree (public_slug) WHERE (public_slug IS NOT NULL)",
          false,
          true,
          "(public_slug IS NOT NULL)"
        ],
        [
          "group_customization_vanity_invite_slug_unique",
          "CREATE UNIQUE INDEX group_customization_vanity_invite_slug_unique ON public.group_customization USING btree (vanity_invite_slug) WHERE (vanity_invite_slug IS NOT NULL)",
          false,
          true,
          "(vanity_invite_slug IS NOT NULL)"
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
  ]
}$contract$::jsonb;
  t jsonb; col jsonb; item jsonb; table_oid oid; actual record; actual_text text;
  expected text; labels jsonb; role_name text; privilege_name text;
BEGIN
  SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) INTO labels
    FROM pg_enum e WHERE e.enumtypid = to_regtype('public.subscription_tier');
  IF labels IS DISTINCT FROM contract->'labels' THEN
    RAISE EXCEPTION 'Commerce prerequisite incompatible subscription_tier labels/order';
  END IF;
  FOR t IN SELECT value FROM jsonb_array_elements(contract->'tables') LOOP
    table_oid := to_regclass('public.' || (t->>'name'));
    IF table_oid IS NULL OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=table_oid
      AND relkind='r' AND relrowsecurity AND NOT relforcerowsecurity) THEN
      RAISE EXCEPTION 'Commerce prerequisite incompatible table/RLS %', t->>'name';
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
        OR actual.attcollation <> (CASE WHEN col->>1 LIKE 'character varying%'
          THEN 'pg_catalog.default'::regcollation::oid ELSE 0::oid END) THEN
        RAISE EXCEPTION 'Commerce prerequisite incompatible column type %.%', t->>'name',col->>0;
      END IF;
      IF actual.attnotnull = (col->>2)::boolean OR actual.default_expr IS DISTINCT FROM col->>3 THEN
        RAISE EXCEPTION 'Commerce prerequisite incompatible nullability/default %.%', t->>'name',col->>0;
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
        RAISE EXCEPTION 'Commerce prerequisite incompatible constraint %.%',t->>'name',item->>0;
      END IF;
    END LOOP;
    IF t->>'name'='group_boosts' AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=table_oid AND contype='p') THEN
      RAISE EXCEPTION 'Commerce prerequisite incompatible group_boosts primary key';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'indexes') LOOP
      SELECT regexp_replace(replace(pg_get_indexdef(i.indexrelid),'public.',''),'\s+',' ','g') INTO actual_text
        FROM pg_index i JOIN pg_class idx ON idx.oid=i.indexrelid
        WHERE i.indrelid=table_oid AND idx.relname=item->>0 AND i.indisvalid AND i.indisready AND i.indislive
          AND i.indisprimary=(item->>2)::boolean AND i.indisunique=(item->>3)::boolean
          AND pg_get_expr(i.indpred,i.indrelid) IS NOT DISTINCT FROM item->>4;
      IF actual_text IS DISTINCT FROM regexp_replace(replace(item->>1,'public.',''),'\s+',' ','g') THEN
        RAISE EXCEPTION 'Commerce prerequisite incompatible index %.%',t->>'name',item->>0;
      END IF;
    END LOOP;
    -- Extra policy definitions would change this attested access contract.
    IF (SELECT count(*) FROM pg_policy WHERE polrelid=table_oid) <> jsonb_array_length(t->'policies') THEN
      RAISE EXCEPTION 'Commerce prerequisite incompatible policy set %',t->>'name';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'policies') LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid=table_oid AND p.polname=item->>'name'
        AND p.polcmd::text=item->>'command' AND p.polpermissive=(item->>'permissive')::boolean
        AND (SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r)
          FROM unnest(p.polroles) r)=item->'roles'
        AND pg_get_expr(p.polqual,p.polrelid) IS NOT DISTINCT FROM item->>'using_expression'
        AND pg_get_expr(p.polwithcheck,p.polrelid) IS NOT DISTINCT FROM item->>'check_expression') THEN
        RAISE EXCEPTION 'Commerce prerequisite incompatible policy %.%',t->>'name',item->>'name';
      END IF;
    END LOOP;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'grants') LOOP
      IF NOT has_table_privilege(item->>0,table_oid,item->>1) THEN
        RAISE EXCEPTION 'Commerce prerequisite incompatible grant % % %',t->>'name',item->>0,item->>1;
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_class c, LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      WHERE c.oid=table_oid AND a.grantee=0) THEN
      RAISE EXCEPTION 'Commerce prerequisite incompatible PUBLIC table access %',t->>'name';
    END IF;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
        privilege_name := 'MAINTAIN';
        IF NOT has_table_privilege(role_name,table_oid,privilege_name) THEN
          RAISE EXCEPTION 'Commerce prerequisite incompatible MAINTAIN grant % %',t->>'name',role_name;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $validate$;
-- END COMMERCE PREREQUISITE READ-ONLY VALIDATION
