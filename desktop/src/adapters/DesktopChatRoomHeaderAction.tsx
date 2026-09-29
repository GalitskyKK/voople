import { VoiceRoomButton } from "@/components/chat/voice/VoiceRoomButton";

export function DesktopChatRoomHeaderAction({
  chatId,
  chatName,
  chatType,
  isRootGroup,
}: {
  chatId: string;
  chatName: string;
  chatType: "direct" | "group";
  isRootGroup: boolean;
  canCreatePinned: boolean;
  onOpenProfile: (username: string) => void;
}) {
  if (isRootGroup) return null;

  return <VoiceRoomButton chatId={chatId} chatName={chatName} chatType={chatType} />;
}
