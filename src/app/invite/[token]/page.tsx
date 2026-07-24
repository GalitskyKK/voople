import { ChatInvitePage } from "@/components/chat/ChatInvitePage";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  return <ChatInvitePage token={token} />;
}
