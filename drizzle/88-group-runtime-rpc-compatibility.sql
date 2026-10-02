-- Two verified legacy Group runtime RPCs; no table DDL or row changes.
-- Evidence canonical LF SHA-256: 240022b707ec3e9a6473733e26a5c31cbe775bacbe66957795959c9b567a71db
-- Historical candidates reproduced in PostgreSQL 16 with exact attested MD5/LF.
DO $create$
BEGIN
  IF to_regprocedure('public.accept_group_vanity_invite(character varying,uuid)') IS NULL THEN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='accept_group_vanity_invite') THEN
      RAISE EXCEPTION 'Group runtime RPC incompatible function signature accept_group_vanity_invite';
    END IF;
    EXECUTE $definition$CREATE FUNCTION public.accept_group_vanity_invite(p_slug character varying, p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_chat_id uuid;
  v_boost_count integer;
  v_grace_level integer;
  v_member_count integer;
begin
  select gc.chat_id
  into v_chat_id
  from public.group_customization gc
  join public.chats c on c.id = gc.chat_id and c.type = 'group'
  where gc.vanity_invite_slug = p_slug
  for update of gc;

  if v_chat_id is null then
    raise exception 'Invite is unavailable';
  end if;

  select count(*)
  into v_boost_count
  from public.group_boosts gb
  join public.subscriptions s on s.user_id = gb.user_id
  where gb.chat_id = v_chat_id
    and s.expires_at > now() - interval '72 hours';

  select case when boost_grace_until > now()
    then coalesce(boost_grace_level, 0) else 0 end
  into v_grace_level
  from public.group_customization
  where chat_id = v_chat_id;

  if greatest(v_boost_count, v_grace_level) < 24 then
    raise exception 'Invite is unavailable';
  end if;

  if exists (
    select 1 from public.chat_members
    where chat_id = v_chat_id and user_id = p_user_id
  ) then
    return v_chat_id;
  end if;

  select count(*) into v_member_count
  from public.chat_members
  where chat_id = v_chat_id;

  if v_member_count >= 20 then
    raise exception 'Group is full';
  end if;

  insert into public.chat_members (chat_id, user_id, role)
  values (v_chat_id, p_user_id, 'member');

  return v_chat_id;
end;
$function$
$definition$;
    REVOKE EXECUTE ON FUNCTION public.accept_group_vanity_invite(character varying,uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.accept_group_vanity_invite(character varying,uuid) TO service_role;
  END IF;
  IF to_regprocedure('public.assign_group_boost_slot(uuid,smallint,uuid,uuid)') IS NULL THEN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='assign_group_boost_slot') THEN
      RAISE EXCEPTION 'Group runtime RPC incompatible function signature assign_group_boost_slot';
    END IF;
    EXECUTE $definition$CREATE FUNCTION public.assign_group_boost_slot(p_user_id uuid, p_slot smallint, p_chat_id uuid, p_idempotency_key uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE current_slot public.group_boosts%ROWTYPE; previous_count integer;
BEGIN
  IF p_slot < 1 OR p_slot > 3 THEN RAISE EXCEPTION 'invalid_boost_slot'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = p_user_id AND expires_at > now())
    THEN RAISE EXCEPTION 'active_subscription_required'; END IF;
  IF p_chat_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.chat_members member JOIN public.chats chat ON chat.id = member.chat_id
    WHERE member.user_id = p_user_id AND member.chat_id = p_chat_id
      AND chat.type = 'group' AND chat.parent_chat_id IS NULL
  ) THEN RAISE EXCEPTION 'group_membership_required'; END IF;

  SELECT * INTO current_slot FROM public.group_boosts
  WHERE user_id = p_user_id AND slot = p_slot FOR UPDATE;
  IF current_slot.idempotency_key = p_idempotency_key THEN RETURN; END IF;
  IF current_slot.user_id IS NOT NULL AND current_slot.chat_id IS DISTINCT FROM p_chat_id
     AND current_slot.moved_at > now() - interval '7 days'
  THEN RAISE EXCEPTION 'boost_slot_cooldown'; END IF;

  IF current_slot.chat_id IS NOT NULL AND current_slot.chat_id IS DISTINCT FROM p_chat_id THEN
    SELECT count(*) INTO previous_count FROM public.group_boosts boost
    JOIN public.subscriptions subscription ON subscription.user_id = boost.user_id
    WHERE boost.chat_id = current_slot.chat_id AND subscription.expires_at > now();
    INSERT INTO public.group_customization(chat_id, boost_grace_until, boost_grace_level, updated_at)
    VALUES (current_slot.chat_id, now() + interval '72 hours', previous_count, now())
    ON CONFLICT (chat_id) DO UPDATE SET boost_grace_until = EXCLUDED.boost_grace_until,
      boost_grace_level = EXCLUDED.boost_grace_level, updated_at = now();
  END IF;

  INSERT INTO public.group_boosts(user_id, slot, chat_id, assigned_at, moved_at, idempotency_key, created_at)
  VALUES (p_user_id, p_slot, p_chat_id, now(), now(), p_idempotency_key, now())
  ON CONFLICT (user_id, slot) DO UPDATE SET chat_id = EXCLUDED.chat_id,
    assigned_at = EXCLUDED.assigned_at, moved_at = EXCLUDED.moved_at,
    idempotency_key = EXCLUDED.idempotency_key;
END;
$function$
$definition$;
    REVOKE EXECUTE ON FUNCTION public.assign_group_boost_slot(uuid,smallint,uuid,uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.assign_group_boost_slot(uuid,smallint,uuid,uuid) TO service_role;
  END IF;
END $create$;

-- BEGIN GROUP RUNTIME RPC READ-ONLY VALIDATION
DO $validate$
DECLARE
  contract constant jsonb := $contract${
  "functions": [
    {
      "name": "accept_group_vanity_invite",
      "signature": "public.accept_group_vanity_invite(character varying,uuid)",
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
      "definition_md5_lf": "762d06821531d44069f819d2588da65b"
    },
    {
      "name": "assign_group_boost_slot",
      "signature": "public.assign_group_boost_slot(uuid,smallint,uuid,uuid)",
      "result": "void",
      "language": "plpgsql",
      "security": "DEFINER",
      "volatility": "v",
      "strict": false,
      "parallel": "u",
      "default_argument_count": 0,
      "config": [
        "search_path=public"
      ],
      "definition_md5_lf": "399ba680326626907d579c3c3619becc"
    }
  ]
}$contract$::jsonb;
  function_contract jsonb; function_oid oid; actual record;
BEGIN
  FOR function_contract IN SELECT value FROM jsonb_array_elements(contract->'functions') LOOP
    function_oid := to_regprocedure(function_contract->>'signature');
    IF function_oid IS NULL OR (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname=function_contract->>'name') <> 1 THEN
      RAISE EXCEPTION 'Group runtime RPC incompatible function signature %',function_contract->>'name';
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
      RAISE EXCEPTION 'Group runtime RPC incompatible function definition %',function_contract->>'name';
    END IF;
    IF has_function_privilege('anon',function_oid,'EXECUTE')
      OR has_function_privilege('authenticated',function_oid,'EXECUTE')
      OR NOT has_function_privilege('service_role',function_oid,'EXECUTE')
      OR EXISTS (SELECT 1 FROM pg_proc p,LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
        WHERE p.oid=function_oid AND acl.grantee=0 AND acl.privilege_type='EXECUTE') THEN
      RAISE EXCEPTION 'Group runtime RPC incompatible function EXECUTE privileges %',function_contract->>'name';
    END IF;
  END LOOP;
END $validate$;
-- END GROUP RUNTIME RPC READ-ONLY VALIDATION
