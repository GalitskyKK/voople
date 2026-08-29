import { redirect } from "next/navigation"

import { WebSessionBootstrapRecovery } from "@/components/auth/WebSessionBootstrapRecovery"
import { api } from "@/lib/trpc/server"
import { getServerAuthBootstrap } from "@/server/services/auth-session.service"

export default async function MePage() {
  const bootstrap = await getServerAuthBootstrap()
  if (bootstrap.status === "error") {
    return <WebSessionBootstrapRecovery reason={bootstrap.reason} />
  }
  const user = bootstrap.value

  if (!user) {
    redirect("/login")
  }

  const caller = await api()
  const { username } = await caller.user.me()
  redirect(`/${username}`)
}
