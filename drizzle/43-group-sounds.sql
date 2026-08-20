create table if not exists public.group_sounds (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade,
  name varchar(32) not null,
  storage_key varchar(512) not null,
  duration_ms integer not null check (duration_ms between 200 and 10000),
  rights_confirmed boolean not null default false,
  moderation_status varchar(24) not null default 'automated_approved',
  created_at timestamptz not null default now(),
  constraint group_sounds_name_check check (name ~ '^[[:alnum:]_ -]{2,32}$'),
  constraint group_sounds_chat_name_unique unique(chat_id, name)
);

create index if not exists group_sounds_chat_idx on public.group_sounds(chat_id, created_at);
alter table public.group_sounds enable row level security;
revoke all on table public.group_sounds from anon, authenticated;
grant all on table public.group_sounds to service_role;

create or replace function public.register_group_sound(
  p_id uuid, p_chat_id uuid, p_user_id uuid, p_name varchar,
  p_storage_key varchar, p_duration_ms integer, p_rights_confirmed boolean
) returns void language plpgsql security definer set search_path = public as $$
declare active_boosts integer; effective_boosts integer; sound_limit integer;
begin
  if not p_rights_confirmed then raise exception 'rights_confirmation_required'; end if;
  if p_duration_ms < 200 or p_duration_ms > 10000 then raise exception 'invalid_sound_duration'; end if;
  if not exists (
    select 1 from public.chat_members member join public.chats chat on chat.id = member.chat_id
    where member.chat_id = p_chat_id and member.user_id = p_user_id
      and member.role in ('owner', 'admin') and chat.type = 'group' and chat.parent_chat_id is null
  ) then raise exception 'group_admin_required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_chat_id::text, 1));
  select count(*) into active_boosts from public.group_boosts boost
  join public.subscriptions subscription on subscription.user_id = boost.user_id
  where boost.chat_id = p_chat_id and subscription.expires_at > now() - interval '72 hours';
  select greatest(active_boosts, case when customization.boost_grace_until > now()
    then coalesce(customization.boost_grace_level, 0) else 0 end)
    into effective_boosts from (select 1) singleton
    left join public.group_customization customization on customization.chat_id = p_chat_id;
  effective_boosts := coalesce(effective_boosts, active_boosts, 0);
  sound_limit := case when effective_boosts >= 24 then 48 when effective_boosts >= 12 then 32
    when effective_boosts >= 6 then 16 when effective_boosts >= 3 then 8 else 0 end;
  if sound_limit = 0 then raise exception 'group_sound_level_required'; end if;
  if (select count(*) from public.group_sounds where chat_id = p_chat_id) >= sound_limit
    then raise exception 'group_sound_limit_reached'; end if;

  insert into public.group_sounds(id, chat_id, created_by, name, storage_key, duration_ms,
    rights_confirmed, moderation_status, created_at)
  values (p_id, p_chat_id, p_user_id, p_name, p_storage_key, p_duration_ms,
    true, 'automated_approved', now());
end;
$$;

revoke all on function public.register_group_sound(uuid, uuid, uuid, varchar, varchar, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.register_group_sound(uuid, uuid, uuid, varchar, varchar, integer, boolean)
  to service_role;
