import { redirect } from "next/navigation";

import { isAdminUserId } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export async function requireAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/assets");
  }

  if (!isAdminUserId(user.id)) {
    redirect("/feed");
  }

  return user;
}
