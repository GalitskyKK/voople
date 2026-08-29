import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicGroupPage } from "@/components/chat/PublicGroupPage";
import { WebSessionBootstrapRecovery } from "@/components/auth/WebSessionBootstrapRecovery";
import { getServerAuthBootstrap } from "@/server/services/auth-session.service";
import { getPublicGroupBySlug } from "@/server/services/chat.service";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const group = await getPublicGroupBySlug(slug);
  return group
    ? { title: `${group.name} — Вупл.`, description: group.description ?? `Открытая группа @${group.publicSlug}` }
    : {};
}

export default async function GroupPage({ params }: PageProps) {
  const { slug } = await params;
  const bootstrap = await getServerAuthBootstrap();
  if (bootstrap.status === "error") {
    return <WebSessionBootstrapRecovery reason={bootstrap.reason} />;
  }
  const user = bootstrap.value;
  const group = await getPublicGroupBySlug(slug, user?.id);
  if (!group) notFound();
  return <PublicGroupPage group={group} />;
}
