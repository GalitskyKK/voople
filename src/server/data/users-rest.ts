import { getAdminClient } from "@/lib/supabase/admin";
import { usernameSchema } from "@/lib/validation/username";
import {
  toProfileCustomizationView,
  type CustomizationRow,
} from "@/server/mappers/customization";

export type AuthUserInput = {
  id: string;
  email?: string | null;
  preferredUsername?: string;
};

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  pinnedThought: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  pinned_thought: string | null;
  created_at: string;
  updated_at: string;
};

function mapUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    pinnedThought: row.pinned_thought,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function baseFromEmail(email: string) {
  const local = email.split("@")[0] ?? "user";
  const cleaned = local.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
  return (cleaned || "user").slice(0, 24);
}

export async function fetchUsernameById(userId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.username ?? null;
}

export async function fetchCurrentUserSummary(userId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("users")
    .select(
      "id, username, display_name, profile_customization (avatar_type, avatar_data, animated_avatar_id, avatar_decoration_id, avatar_ring_id)",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const related = data.profile_customization as
    | CustomizationRow
    | CustomizationRow[]
    | null;
  const customization = toProfileCustomizationView(
    Array.isArray(related) ? related[0] : related,
  );

  return {
    id: data.id as string,
    username: data.username as string,
    displayName: data.display_name as string,
    avatarUrl: customization.assets.animatedAvatarUrl,
    avatarDecorationUrl: customization.assets.avatarDecorationUrl,
    avatarRingId: customization.avatarRingId,
  };
}

export async function isUsernameAvailable(username: string, excludeUserId?: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return true;
  return excludeUserId ? data.id === excludeUserId : false;
}

async function pickUsername(base: string) {
  let candidate = base.slice(0, 30);
  for (let i = 0; i < 100; i++) {
    if (await isUsernameAvailable(candidate)) return candidate;
    candidate = `${base}${i + 1}`.slice(0, 30);
  }
  return `user_${Date.now().toString(36)}`.slice(0, 30);
}

async function resolveUsername(authUser: AuthUserInput) {
  if (authUser.preferredUsername) {
    const parsed = usernameSchema.safeParse(authUser.preferredUsername);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Некорректный username");
    }
    const username = parsed.data;
    if (!(await isUsernameAvailable(username))) {
      throw new Error("Это имя пользователя уже занято");
    }
    return username;
  }
  return pickUsername(baseFromEmail(authUser.email ?? "user"));
}

function displayNameFromUsername(username: string) {
  return username.length > 0
    ? username.charAt(0).toUpperCase() + username.slice(1)
    : "User";
}

async function ensureProfileRows(userId: string) {
  const admin = getAdminClient();
  const { error: cErr } = await admin
    .from("profile_customization")
    .upsert({ user_id: userId }, { onConflict: "user_id" });
  if (cErr) throw new Error(cErr.message);

  const { error: sErr } = await admin
    .from("user_status")
    .upsert({ user_id: userId }, { onConflict: "user_id" });
  if (sErr) throw new Error(sErr.message);
}

/** Auth bootstrap — только HTTPS REST (быстро при нестабильном Postgres с Windows) */
export async function ensurePublicUser(authUser: AuthUserInput) {
  const admin = getAdminClient();

  const { data: existing, error: selectErr } = await admin
    .from("users")
    .select("id, username, display_name, bio, pinned_thought, created_at, updated_at")
    .eq("id", authUser.id)
    .maybeSingle();

  if (selectErr) throw new Error(selectErr.message);

  if (existing) {
    await ensureProfileRows(authUser.id);
    return { user: mapUser(existing as UserRow), created: false as const };
  }

  const username = await resolveUsername(authUser);
  const displayName = displayNameFromUsername(username);

  const { data: inserted, error: insertErr } = await admin
    .from("users")
    .insert({
      id: authUser.id,
      username,
      display_name: displayName,
    })
    .select("id, username, display_name, bio, pinned_thought, created_at, updated_at")
    .single();

  if (insertErr) throw new Error(insertErr.message);

  await ensureProfileRows(authUser.id);

  return { user: mapUser(inserted as UserRow), created: true as const };
}
