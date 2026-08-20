import { GroupSettingsPage } from "@/components/chat/GroupSettingsPage";

export default async function ChatSettingsRoute({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  return <GroupSettingsPage chatId={chatId} />;
}
