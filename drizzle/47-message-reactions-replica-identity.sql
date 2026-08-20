-- Supabase Realtime publishes deletes from message_reactions. The table uses
-- partial unique indexes for native and custom emoji, so it has no single
-- primary key that PostgreSQL can use as the replica identity.

ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

COMMENT ON TABLE public.message_reactions IS
  'Chat reactions. REPLICA IDENTITY FULL is required for Realtime DELETE events.';
