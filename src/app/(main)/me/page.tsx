import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { api } from "@/lib/trpc/server"

export default async function MePage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const caller = await api()
  const { username } = await caller.user.me()
  redirect(`/${username}`)
}
