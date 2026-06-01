import { eq } from "drizzle-orm";

import { requireDb } from "@/server/db/require";
import { users } from "@/server/db/schema";

export async function updateUserProfile(
  userId: string,
  data: { displayName?: string; bio?: string | null },
) {
  const patch: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.displayName !== undefined) {
    const name = data.displayName.trim();
    if (!name) throw new Error("Имя не может быть пустым");
    if (name.length > 50) throw new Error("Максимум 50 символов");
    patch.displayName = name;
  }

  if (data.bio !== undefined) {
    const bio = data.bio?.trim() ?? "";
    if (bio.length > 100) throw new Error("Био — максимум 100 символов");
    patch.bio = bio || null;
  }

  const [updated] = await requireDb()
    .update(users)
    .set(patch)
    .where(eq(users.id, userId))
    .returning({ displayName: users.displayName, bio: users.bio });

  if (!updated) throw new Error("Пользователь не найден");

  return {
    displayName: updated.displayName,
    bio: updated.bio,
  };
}
