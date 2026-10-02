-- Legacy commerce base only: no seeds, wallets, payments, promos or issuance.
-- Evidence captured 2026-10-01T11:09:53.405Z; canonical LF SHA-256:
-- 240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db
-- Supplemental replica evidence canonical LF SHA-256: 4037091b4d7a4b3efa6e110e86b9bbdea1bc8e7a80b952749c1ae8941dc13462
-- Apply after 45/82/83 and before 38..81 through the transactional runner.
DO $create$
BEGIN
  IF to_regtype('public.item_type') IS NULL THEN
    CREATE TYPE public.item_type AS ENUM ('effect','ring','banner','nameplate','badge','reaction_pack','decoration','feed_card','app_theme','profile_background','frame');
  END IF;
  IF to_regtype('public.acquired_via') IS NULL THEN
    CREATE TYPE public.acquired_via AS ENUM ('purchase','earned','gifted','seasonal_reward','free_claim');
  END IF;
  IF to_regtype('public.avatar_type') IS NULL THEN
    CREATE TYPE public.avatar_type AS ENUM ('constructor','photo');
  END IF;
  IF to_regtype('public.banner_type') IS NULL THEN
    CREATE TYPE public.banner_type AS ENUM ('color','pattern','animated');
  END IF;
  IF to_regclass('public.shop_items') IS NULL THEN
    CREATE TABLE public.shop_items (
      id character varying(100) NOT NULL,
      season_id character varying(50),
      type public.item_type NOT NULL,
      name character varying(100) NOT NULL,
      price_rub integer NOT NULL,
      apng_url character varying(500),
      preview_url character varying(500),
      is_limited boolean DEFAULT false,
      stock integer,
      sold_count integer DEFAULT 0 NOT NULL,
      requires_subscription public.subscription_tier,
      price_coins integer DEFAULT 0 NOT NULL,
      is_free boolean DEFAULT false NOT NULL,
      description character varying(300),
      sort_order integer DEFAULT 0 NOT NULL,
      asset_folder character varying(50),
      asset_id character varying(100),
      equip_slot character varying(40),
      equip_value character varying(100),
      kind character varying(50),
      CONSTRAINT shop_items_pkey PRIMARY KEY (id)
    );
    CREATE INDEX shop_items_kind_idx ON public.shop_items USING btree (kind);
    CREATE INDEX shop_items_sort_idx ON public.shop_items USING btree (sort_order);
    ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.shop_items FROM PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.shop_items TO anon, authenticated, service_role;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'GRANT MAINTAIN ON TABLE public.shop_items TO anon, authenticated, service_role';
    END IF;
    CREATE POLICY shop_items_select_public ON public.shop_items FOR SELECT TO PUBLIC USING (true);
  END IF;
  IF to_regclass('public.user_inventory') IS NULL THEN
    CREATE TABLE public.user_inventory (
      id uuid DEFAULT gen_random_uuid() NOT NULL,
      user_id uuid NOT NULL,
      item_id character varying(100) NOT NULL,
      acquired_at timestamp without time zone DEFAULT now() NOT NULL,
      acquired_via public.acquired_via NOT NULL,
      CONSTRAINT user_inventory_item_id_shop_items_id_fk FOREIGN KEY (item_id) REFERENCES public.shop_items(id),
      CONSTRAINT user_inventory_pkey PRIMARY KEY (id),
      CONSTRAINT user_inventory_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX inventory_unique ON public.user_inventory USING btree (user_id, item_id);
    CREATE INDEX inventory_user_idx ON public.user_inventory USING btree (user_id);
    ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.user_inventory FROM PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.user_inventory TO anon, authenticated, service_role;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'GRANT MAINTAIN ON TABLE public.user_inventory TO anon, authenticated, service_role';
    END IF;
    CREATE POLICY user_inventory_select_own ON public.user_inventory FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));
  END IF;
  IF to_regclass('public.profile_customization') IS NULL THEN
    CREATE TABLE public.profile_customization (
      user_id uuid NOT NULL,
      banner_type public.banner_type DEFAULT 'color'::public.banner_type NOT NULL,
      banner_value jsonb DEFAULT '{"color": "#1A0D2E"}'::jsonb NOT NULL,
      avatar_type public.avatar_type DEFAULT 'constructor'::public.avatar_type NOT NULL,
      avatar_data jsonb DEFAULT '{}'::jsonb NOT NULL,
      avatar_ring_id character varying(100),
      profile_effect_id character varying(100),
      nameplate_id character varying(100),
      nickname_color character varying(20),
      nickname_gradient boolean DEFAULT false,
      theme_primary character varying(7) DEFAULT '#0A0A0F'::character varying,
      theme_accent character varying(7) DEFAULT '#7B3AED'::character varying,
      updated_at timestamp without time zone DEFAULT now() NOT NULL,
      avatar_decoration_id character varying(100),
      feed_card_style_id character varying(100),
      animated_avatar_id character varying(100),
      app_theme_id character varying(30),
      profile_background_id character varying(100),
      profile_frame_id character varying(100),
      frame_color character varying(20),
      card_base_mode character varying(20),
      nickname_font character varying(20) DEFAULT 'sans'::character varying NOT NULL,
      nickname_effect character varying(20) DEFAULT 'plain'::character varying NOT NULL,
      CONSTRAINT profile_customization_pkey PRIMARY KEY (user_id),
      CONSTRAINT profile_customization_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
    );
    ALTER TABLE public.profile_customization ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.profile_customization FROM PUBLIC;
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.profile_customization TO anon, authenticated, service_role;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      EXECUTE 'GRANT MAINTAIN ON TABLE public.profile_customization TO anon, authenticated, service_role';
    END IF;
    CREATE POLICY profile_customization_delete_own ON public.profile_customization FOR DELETE TO PUBLIC USING ((auth.uid() = user_id));
    CREATE POLICY profile_customization_insert_own ON public.profile_customization FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = user_id));
    CREATE POLICY profile_customization_select_public ON public.profile_customization FOR SELECT TO PUBLIC USING (true);
    CREATE POLICY profile_customization_update_own ON public.profile_customization FOR UPDATE TO PUBLIC USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
  END IF;
END $create$;

-- BEGIN COMMERCE BASE READ-ONLY VALIDATION
DO $validate$
DECLARE
  contract jsonb := $contract${
  "evidenceCapturedAt": "2026-10-01T11:09:53.405Z",
  "evidenceLfSha256": "240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db",
  "replicaEvidenceLfSha256": "4037091b4d7a4b3efa6e110e86b9bbdea1bc8e7a80b952749c1ae8941dc13462",
  "enums": [
    [
      "item_type",
      [
        "effect",
        "ring",
        "banner",
        "nameplate",
        "badge",
        "reaction_pack",
        "decoration",
        "feed_card",
        "app_theme",
        "profile_background",
        "frame"
      ]
    ],
    [
      "acquired_via",
      [
        "purchase",
        "earned",
        "gifted",
        "seasonal_reward",
        "free_claim"
      ]
    ],
    [
      "avatar_type",
      [
        "constructor",
        "photo"
      ]
    ],
    [
      "banner_type",
      [
        "color",
        "pattern",
        "animated"
      ]
    ]
  ],
  "tables": [
    {
      "name": "shop_items",
      "replica": "d",
      "columns": [
        [
          "id",
          "character varying(100)",
          false,
          null,
          "default"
        ],
        [
          "season_id",
          "character varying(50)",
          true,
          null,
          "default"
        ],
        [
          "type",
          "public.item_type",
          false,
          null,
          null
        ],
        [
          "name",
          "character varying(100)",
          false,
          null,
          "default"
        ],
        [
          "price_rub",
          "integer",
          false,
          null,
          null
        ],
        [
          "apng_url",
          "character varying(500)",
          true,
          null,
          "default"
        ],
        [
          "preview_url",
          "character varying(500)",
          true,
          null,
          "default"
        ],
        [
          "is_limited",
          "boolean",
          true,
          "false",
          null
        ],
        [
          "stock",
          "integer",
          true,
          null,
          null
        ],
        [
          "sold_count",
          "integer",
          false,
          "0",
          null
        ],
        [
          "requires_subscription",
          "public.subscription_tier",
          true,
          null,
          null
        ],
        [
          "price_coins",
          "integer",
          false,
          "0",
          null
        ],
        [
          "is_free",
          "boolean",
          false,
          "false",
          null
        ],
        [
          "description",
          "character varying(300)",
          true,
          null,
          "default"
        ],
        [
          "sort_order",
          "integer",
          false,
          "0",
          null
        ],
        [
          "asset_folder",
          "character varying(50)",
          true,
          null,
          "default"
        ],
        [
          "asset_id",
          "character varying(100)",
          true,
          null,
          "default"
        ],
        [
          "equip_slot",
          "character varying(40)",
          true,
          null,
          "default"
        ],
        [
          "equip_value",
          "character varying(100)",
          true,
          null,
          "default"
        ],
        [
          "kind",
          "character varying(50)",
          true,
          null,
          "default"
        ]
      ],
      "constraints": [
        [
          "shop_items_pkey",
          "PRIMARY KEY (id)",
          "p"
        ]
      ],
      "indexes": [
        [
          "shop_items_kind_idx",
          "CREATE INDEX shop_items_kind_idx ON public.shop_items USING btree (kind)",
          false,
          false,
          null,
          null
        ],
        [
          "shop_items_pkey",
          "CREATE UNIQUE INDEX shop_items_pkey ON public.shop_items USING btree (id)",
          true,
          true,
          null,
          null
        ],
        [
          "shop_items_sort_idx",
          "CREATE INDEX shop_items_sort_idx ON public.shop_items USING btree (sort_order)",
          false,
          false,
          null,
          null
        ]
      ],
      "policies": [
        {
          "name": "shop_items_select_public",
          "command": "r",
          "permissive": true,
          "roles": [
            "PUBLIC"
          ],
          "using_expression": "true",
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
      "name": "user_inventory",
      "replica": "d",
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
          "item_id",
          "character varying(100)",
          false,
          null,
          "default"
        ],
        [
          "acquired_at",
          "timestamp without time zone",
          false,
          "now()",
          null
        ],
        [
          "acquired_via",
          "public.acquired_via",
          false,
          null,
          null
        ]
      ],
      "constraints": [
        [
          "user_inventory_item_id_shop_items_id_fk",
          "FOREIGN KEY (item_id) REFERENCES public.shop_items(id)",
          "f"
        ],
        [
          "user_inventory_pkey",
          "PRIMARY KEY (id)",
          "p"
        ],
        [
          "user_inventory_user_id_users_id_fk",
          "FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE",
          "f"
        ]
      ],
      "indexes": [
        [
          "inventory_unique",
          "CREATE UNIQUE INDEX inventory_unique ON public.user_inventory USING btree (user_id, item_id)",
          false,
          true,
          null,
          null
        ],
        [
          "inventory_user_idx",
          "CREATE INDEX inventory_user_idx ON public.user_inventory USING btree (user_id)",
          false,
          false,
          null,
          null
        ],
        [
          "user_inventory_pkey",
          "CREATE UNIQUE INDEX user_inventory_pkey ON public.user_inventory USING btree (id)",
          true,
          true,
          null,
          null
        ]
      ],
      "policies": [
        {
          "name": "user_inventory_select_own",
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
      "name": "profile_customization",
      "replica": "d",
      "columns": [
        [
          "user_id",
          "uuid",
          false,
          null,
          null
        ],
        [
          "banner_type",
          "public.banner_type",
          false,
          "'color'::public.banner_type",
          null
        ],
        [
          "banner_value",
          "jsonb",
          false,
          "'{\"color\": \"#1A0D2E\"}'::jsonb",
          null
        ],
        [
          "avatar_type",
          "public.avatar_type",
          false,
          "'constructor'::public.avatar_type",
          null
        ],
        [
          "avatar_data",
          "jsonb",
          false,
          "'{}'::jsonb",
          null
        ],
        [
          "avatar_ring_id",
          "character varying(100)",
          true,
          null,
          "default"
        ],
        [
          "profile_effect_id",
          "character varying(100)",
          true,
          null,
          "default"
        ],
        [
          "nameplate_id",
          "character varying(100)",
          true,
          null,
          "default"
        ],
        [
          "nickname_color",
          "character varying(20)",
          true,
          null,
          "default"
        ],
        [
          "nickname_gradient",
          "boolean",
          true,
          "false",
          null
        ],
        [
          "theme_primary",
          "character varying(7)",
          true,
          "'#0A0A0F'::character varying",
          "default"
        ],
        [
          "theme_accent",
          "character varying(7)",
          true,
          "'#7B3AED'::character varying",
          "default"
        ],
        [
          "updated_at",
          "timestamp without time zone",
          false,
          "now()",
          null
        ],
        [
          "avatar_decoration_id",
          "character varying(100)",
          true,
          null,
          "default"
        ],
        [
          "feed_card_style_id",
          "character varying(100)",
          true,
          null,
          "default"
        ],
        [
          "animated_avatar_id",
          "character varying(100)",
          true,
          null,
          "default"
        ],
        [
          "app_theme_id",
          "character varying(30)",
          true,
          null,
          "default"
        ],
        [
          "profile_background_id",
          "character varying(100)",
          true,
          null,
          "default"
        ],
        [
          "profile_frame_id",
          "character varying(100)",
          true,
          null,
          "default"
        ],
        [
          "frame_color",
          "character varying(20)",
          true,
          null,
          "default"
        ],
        [
          "card_base_mode",
          "character varying(20)",
          true,
          null,
          "default"
        ],
        [
          "nickname_font",
          "character varying(20)",
          false,
          "'sans'::character varying",
          "default"
        ],
        [
          "nickname_effect",
          "character varying(20)",
          false,
          "'plain'::character varying",
          "default"
        ]
      ],
      "constraints": [
        [
          "profile_customization_pkey",
          "PRIMARY KEY (user_id)",
          "p"
        ],
        [
          "profile_customization_user_id_users_id_fk",
          "FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE",
          "f"
        ]
      ],
      "indexes": [
        [
          "profile_customization_pkey",
          "CREATE UNIQUE INDEX profile_customization_pkey ON public.profile_customization USING btree (user_id)",
          true,
          true,
          null,
          null
        ]
      ],
      "policies": [
        {
          "name": "profile_customization_delete_own",
          "command": "d",
          "permissive": true,
          "roles": [
            "PUBLIC"
          ],
          "using_expression": "(auth.uid() = user_id)",
          "check_expression": null
        },
        {
          "name": "profile_customization_insert_own",
          "command": "a",
          "permissive": true,
          "roles": [
            "PUBLIC"
          ],
          "using_expression": null,
          "check_expression": "(auth.uid() = user_id)"
        },
        {
          "name": "profile_customization_select_public",
          "command": "r",
          "permissive": true,
          "roles": [
            "PUBLIC"
          ],
          "using_expression": "true",
          "check_expression": null
        },
        {
          "name": "profile_customization_update_own",
          "command": "w",
          "permissive": true,
          "roles": [
            "PUBLIC"
          ],
          "using_expression": "(auth.uid() = user_id)",
          "check_expression": "(auth.uid() = user_id)"
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
  ]
}$contract$::jsonb;
  enum_contract jsonb; enum_oid oid; t jsonb; col jsonb; item jsonb; table_oid oid; actual record; actual_text text;
  expected text; labels jsonb; role_name text; privilege_name text;
BEGIN
  FOR enum_contract IN SELECT value FROM jsonb_array_elements(contract->'enums') LOOP
    enum_oid := to_regtype('public.' || (enum_contract->>0));
    IF enum_oid IS NULL OR NOT EXISTS (SELECT 1 FROM pg_type ty JOIN pg_namespace n ON n.oid=ty.typnamespace
      WHERE ty.oid=enum_oid AND ty.typtype='e' AND n.nspname='public') THEN
      RAISE EXCEPTION 'Commerce base incompatible enum namespace/kind %',enum_contract->>0;
    END IF;
    SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) INTO labels FROM pg_enum e WHERE e.enumtypid=enum_oid;
    IF labels IS DISTINCT FROM enum_contract->1 THEN
      RAISE EXCEPTION 'Commerce base incompatible enum labels/order %',enum_contract->>0;
    END IF;
  END LOOP;
  FOR t IN SELECT value FROM jsonb_array_elements(contract->'tables') LOOP
    table_oid := to_regclass('public.' || (t->>'name'));
    IF table_oid IS NULL OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=table_oid
      AND relkind='r' AND relrowsecurity AND NOT relforcerowsecurity AND relreplident::text=t->>'replica') THEN
      RAISE EXCEPTION 'Commerce base incompatible table/RLS %', t->>'name';
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
        RAISE EXCEPTION 'Commerce base incompatible column type %.%', t->>'name',col->>0;
      END IF;
      IF actual.attnotnull = (col->>2)::boolean OR replace(actual.default_expr,'public.','') IS DISTINCT FROM replace(col->>3,'public.','') THEN
        RAISE EXCEPTION 'Commerce base incompatible nullability/default %.%', t->>'name',col->>0;
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
        RAISE EXCEPTION 'Commerce base incompatible constraint %.%',t->>'name',item->>0;
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
        RAISE EXCEPTION 'Commerce base incompatible index %.%',t->>'name',item->>0;
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
      RAISE EXCEPTION 'Commerce base incompatible extra policy %',t->>'name';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'policies') LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid=table_oid AND p.polname=item->>'name'
        AND p.polcmd::text=item->>'command' AND p.polpermissive=(item->>'permissive')::boolean
        AND (SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r)
          FROM unnest(p.polroles) r)=item->'roles'
        AND pg_get_expr(p.polqual,p.polrelid) IS NOT DISTINCT FROM item->>'using_expression'
        AND pg_get_expr(p.polwithcheck,p.polrelid) IS NOT DISTINCT FROM item->>'check_expression') THEN
        RAISE EXCEPTION 'Commerce base incompatible policy %.%',t->>'name',item->>'name';
      END IF;
    END LOOP;
    FOR item IN SELECT value FROM jsonb_array_elements(t->'grants') LOOP
      IF NOT has_table_privilege(item->>0,table_oid,item->>1) THEN
        RAISE EXCEPTION 'Commerce base incompatible grant % % %',t->>'name',item->>0,item->>1;
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_class c, LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      WHERE c.oid=table_oid AND a.grantee=0) THEN
      RAISE EXCEPTION 'Commerce base incompatible PUBLIC table access %',t->>'name';
    END IF;
    IF current_setting('server_version_num')::integer >= 170000 THEN
      FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
        privilege_name := 'MAINTAIN';
        IF NOT has_table_privilege(role_name,table_oid,privilege_name) THEN
          RAISE EXCEPTION 'Commerce base incompatible MAINTAIN grant % %',t->>'name',role_name;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $validate$;
-- END COMMERCE BASE READ-ONLY VALIDATION
